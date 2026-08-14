import os
import stat
import tempfile
import posixpath
from datetime import datetime, timedelta, timezone

import paramiko
from dotenv import load_dotenv

load_dotenv()

# Files are pulled by a cron window that runs 6 AM - 9 AM IST; only files
# already on the source before this cutoff are eligible for copying.
IST = timezone(timedelta(hours=5, minutes=30))
CUTOFF_HOUR = 9


def create_client(host, port, user, key_path):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    private_key = paramiko.RSAKey.from_private_key_file(key_path)

    client.connect(
        hostname=host,
        port=int(port),
        username=user,
        pkey=private_key
    )
    return client


def remote_path_exists(sftp, path):
    try:
        sftp.stat(path)
        return True
    except FileNotFoundError:
        return False


def ensure_remote_dir(sftp, path):
    if remote_path_exists(sftp, path):
        return

    parent = posixpath.dirname(path.rstrip('/'))
    if parent and parent != path:
        ensure_remote_dir(sftp, parent)

    try:
        sftp.mkdir(path)
    except IOError:
        pass  # created concurrently between the exists check and mkdir


# Load environment variables
SRC_HOST = os.getenv("SRC_HOST")
SRC_PORT = os.getenv("SRC_PORT", 22)
SRC_USER = os.getenv("SRC_USER")
SRC_KEY = os.getenv("SRC_KEY")

DEST_HOST = os.getenv("DEST_HOST")
DEST_PORT = os.getenv("DEST_PORT", 22)
DEST_USER = os.getenv("DEST_USER")
DEST_KEY = os.getenv("DEST_KEY")

SOURCE_DIR = os.getenv("SOURCE_DIR")
DEST_DIR = os.getenv("DEST_DIR")

try:
    now_ist = datetime.now(timezone.utc).astimezone(IST)
    cutoff = now_ist.replace(hour=CUTOFF_HOUR, minute=0, second=0, microsecond=0)
    date_folder = now_ist.strftime("%Y-%m-%d")

    src_client = create_client(SRC_HOST, SRC_PORT, SRC_USER, SRC_KEY)
    src_sftp = src_client.open_sftp()

    dest_client = create_client(DEST_HOST, DEST_PORT, DEST_USER, DEST_KEY)
    dest_sftp = dest_client.open_sftp()

    try:
        dest_day_dir = posixpath.join(DEST_DIR, date_folder)
        ensure_remote_dir(dest_sftp, dest_day_dir)

        copied = []
        skipped_existing = []
        skipped_too_new = []

        for entry in src_sftp.listdir_attr(SOURCE_DIR):
            if entry.st_mode is not None and stat.S_ISDIR(entry.st_mode):
                continue

            modified_at = datetime.fromtimestamp(entry.st_mtime, tz=timezone.utc).astimezone(IST)
            if modified_at >= cutoff:
                skipped_too_new.append(entry.filename)
                continue

            dest_path = posixpath.join(dest_day_dir, entry.filename)
            if remote_path_exists(dest_sftp, dest_path):
                skipped_existing.append(entry.filename)
                continue

            source_path = posixpath.join(SOURCE_DIR, entry.filename)

            tmp_file = tempfile.NamedTemporaryFile(delete=False)
            tmp_path = tmp_file.name
            tmp_file.close()

            try:
                src_sftp.get(source_path, tmp_path)
                dest_sftp.put(tmp_path, dest_path)
                copied.append(entry.filename)
            finally:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)

        print(f"Copied {len(copied)} file(s) to {dest_day_dir}: {copied}")
        print(f"Skipped {len(skipped_existing)} already-copied file(s): {skipped_existing}")
        print(f"Skipped {len(skipped_too_new)} file(s) modified at/after {CUTOFF_HOUR}:00 IST: {skipped_too_new}")

    finally:
        src_sftp.close()
        src_client.close()
        dest_sftp.close()
        dest_client.close()

except Exception as e:
    print(f"Error: {e}")

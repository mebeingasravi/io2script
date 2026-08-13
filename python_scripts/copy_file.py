import os
import tempfile
import paramiko
from dotenv import load_dotenv

load_dotenv()

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

# Load environment variables
SRC_HOST = os.getenv("SRC_HOST")
SRC_PORT = os.getenv("SRC_PORT", 22)
SRC_USER = os.getenv("SRC_USER")
SRC_KEY = os.getenv("SRC_KEY")

DEST_HOST = os.getenv("DEST_HOST")
DEST_PORT = os.getenv("DEST_PORT", 22)
DEST_USER = os.getenv("DEST_USER")
DEST_KEY = os.getenv("DEST_KEY")

SOURCE_FILE = os.getenv("SOURCE_FILE")
DEST_FILE = os.getenv("DEST_FILE")

tmp_file = tempfile.NamedTemporaryFile(delete=False)
tmp_path = tmp_file.name
tmp_file.close()

try:
    # Download from source
    src_client = create_client(SRC_HOST, SRC_PORT, SRC_USER, SRC_KEY)
    src_sftp = src_client.open_sftp()
    src_sftp.get(SOURCE_FILE, tmp_path)
    src_sftp.close()
    src_client.close()

    # Upload to destination
    dest_client = create_client(DEST_HOST, DEST_PORT, DEST_USER, DEST_KEY)
    dest_sftp = dest_client.open_sftp()
    dest_sftp.put(tmp_path, DEST_FILE)
    dest_sftp.close()
    dest_client.close()

    print("File copied successfully.")

except Exception as e:
    print(f"Error: {e}")

finally:
    if os.path.exists(tmp_path):
        os.remove(tmp_path)
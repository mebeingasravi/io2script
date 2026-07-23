# io2script

Streaming, low-latency tick-by-tick market data CSV processor built for high-throughput production workloads (1000+ ticks/sec, multi-GB files) without ever loading a file fully into memory.

## Overview

`io2script` reads a tick-data CSV file line-by-line using Node.js streams (`fs.createReadStream` + `readline`). Every row is processed the moment it is read:

1. Parsed into a structured tick object.
2. Its timestamp is validated against the current processing time.
3. The result is printed to the console (✅ on-time / ❌ late).
4. The same result is appended to a daily JSON log file.

No batching, no buffering the whole file, no unnecessary copies — the goal is minimum latency between a line being read off disk and it being processed.

## Folder Structure

```
src/
  index.js            Application bootstrap, health server, graceful shutdown
  config/              Centralized environment-driven configuration
  controllers/          Orchestrates the read -> process -> print -> log pipeline
  services/
    csvReader.service.js     Streaming line-by-line CSV reader (readline based)
    tickProcessor.service.js Tick validation and log-entry shaping
  utils/
    csvLineParser.js   Zero-dependency RFC4180-aware CSV line parser
    timestamp.js       Timestamp parsing and comparison
    consolePrinter.js  Console output formatting
  logger/               Append-only JSON log writer with daily rotation
  tests/                Jest unit tests
data/
  sample.csv            Example input file
logs/
  app-YYYY-MM-DD.json   Daily newline-delimited JSON log output
```

Modular monolith — one deployable process, clear internal module boundaries, no microservices.

## Installation

```bash
npm install
cp .env.example .env
```

## Local Run

```bash
npm run dev     # watch mode, NODE_ENV=development
npm start       # runs the test suite, then starts the app
```

The app will not start if the test suite fails — `npm start`, `npm run staging`, and `npm run production` all run `npm test` first.

## Environment Variables

| Variable      | Description                             | Default            |
|---------------|------------------------------------------|---------------------|
| `PORT`        | Health-check HTTP server port            | `3000`              |
| `INPUT_FILE`  | Path to the tick CSV file to stream      | `data/sample.csv`   |
| `LOG_PATH`    | Directory for daily JSON log files       | `logs`              |
| `NODE_ENV`    | Runtime environment                      | `development`       |

## Testing

```bash
npm test
```

Jest covers every function in `utils/`, `services/`, `controllers/`, `logger/`, and `config/`, including edge cases: missing files, permission errors, empty lines, malformed rows, invalid timestamps, and quoted CSV fields containing commas.

## Linting

```bash
npm run lint
npm run lint:fix
```

## Docker

Build and run with Docker Compose (runs lint + tests inside the image build, then starts the app):

```bash
docker compose up --build
```

This exposes the health endpoint at `http://localhost:3000/health`, mounts `./data` (read-only) and `./logs` into the container, and restarts automatically unless stopped.

Manual Docker usage:

```bash
docker build -t io2script:latest .
docker run -d --name io2script -p 3000:3000 \
  -e NODE_ENV=production \
  -v $(pwd)/data:/usr/src/app/data:ro \
  -v $(pwd)/logs:/usr/src/app/logs \
  io2script:latest
```

## CI/CD

`.github/workflows/deploy.yml` runs on every push to `main`:

```
Checkout -> Install -> Lint -> Test -> Build Docker Image -> Push Docker Image -> Deploy to AWS EC2 (SSH) -> Restart Container
```

Required GitHub Secrets:

| Secret            | Purpose                                  |
|-------------------|--------------------------------------------|
| `DOCKER_USERNAME` | Docker Hub login                         |
| `DOCKER_PASSWORD` | Docker Hub login                         |
| `EC2_HOST`        | Target EC2 instance address               |
| `EC2_USER`        | SSH user on the EC2 instance               |
| `EC2_SSH_KEY`     | Private SSH key for deployment             |

## AWS EC2 Deployment

The deploy job SSHes into the EC2 instance and runs:

```bash
docker pull <docker_username>/io2script:<sha>
docker stop io2script || true
docker rm io2script || true
docker run -d --name io2script --restart unless-stopped \
  -p ${PORT:-3000}:${PORT:-3000} \
  -e PORT=${PORT:-3000} -e NODE_ENV=production \
  -e INPUT_FILE=data/sample.csv -e LOG_PATH=logs \
  -v /opt/io2script/logs:/usr/src/app/logs \
  -v /opt/io2script/data:/usr/src/app/data:ro \
  <docker_username>/io2script:<sha>
docker image prune -f
```

Ensure `/opt/io2script/{data,logs}` exist on the EC2 host before the first deploy, and that the configured port is open in the instance's security group.

## Error Handling

The application continues processing whenever possible:

- **Missing CSV / permission denied** — the stream promise rejects with a descriptive error at startup; the process exits non-zero.
- **Malformed row / empty line** — logged as a warning, the row is skipped or best-effort mapped, streaming continues.
- **Invalid timestamp** — the row is reported as a row-level error and skipped; the stream is not interrupted.
- **Log directory missing** — created automatically (`mkdir -p` semantics) on startup and on first write.
- **Disk write failure** — caught and logged to `stderr`; does not crash the process or halt CSV processing.

## Performance Notes

- Reading uses `fs.createReadStream` piped through `readline`, processing each line as it arrives — the file is never buffered in full.
- CSV parsing is a hand-rolled, single-pass, allocation-light parser (no regex, no intermediate arrays beyond the field list) that still correctly handles RFC 4180 quoted fields.
- The JSON log writer keeps one `fs.WriteStream` open per day (append mode) instead of opening/closing a file per tick, and relies on Node's internal stream buffering for backpressure instead of blocking the read side.
- No synchronous I/O is used on the hot path (only `mkdirSync` once at startup).
- Dependencies are kept to a minimum (`dotenv` only) to reduce startup and per-tick overhead — no CSV parsing library needed.

## Troubleshooting

| Symptom                          | Likely Cause                                   | Fix |
|-----------------------------------|--------------------------------------------------|-----|
| `Input CSV file not found`        | `INPUT_FILE` path wrong or file not mounted       | Check `.env` / Docker volume mounts |
| `Permission denied reading input CSV file` | File permissions too restrictive        | `chmod` the file or fix volume ownership |
| No log files appear                | `LOG_PATH` directory not writable                 | Ensure the directory exists and the container user has write access |
| All ticks show ❌                  | System clock is behind the tick timestamps        | Sync host/container clock (NTP) |
| `npm start` refuses to launch      | Test suite is failing                             | Run `npm test` locally and fix failures first |

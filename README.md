# kavoru (CLI)

Scaffold a new [Kavoru](https://github.com/mertthesamael/Kavoru) backend — ElysiaJS, Bun, TypeScript, Prisma, and the full production starter stack.

## Usage

After publishing to npm:

```bash
bunx kavoru@latest my-api
cd my-api
bun run dev
```

Always use `@latest` so you get the newest published CLI. Equivalent to `bunx --bun kavoru@latest`.

**Stale CLI after a new publish?** Bun caches `bunx` installs under `%TEMP%\bunx-*-kavoru@latest` and does not auto-refresh. Clear the cache, then run `@latest` again:

```powershell
Remove-Item -Recurse -Force "$env:TEMP\bunx-*-kavoru*"
bunx kavoru@latest my-api
```

```bash
rm -rf "${TMPDIR:-/tmp}"/bunx-*-kavoru*
bunx kavoru@latest my-api
```

### Options

| Flag                | Description                                              |
| ------------------- | -------------------------------------------------------- |
| `-h, --help`        | Show help                                                |
| `-V, --version`     | Show CLI version                                         |
| `-f, --force`       | Scaffold into a non-empty directory                      |
| `--no-install`      | Skip `bun install`                                       |
| `--repo owner/name` | Override template repo (default: `mertthesamael/Kavoru`) |
| `--branch name`     | Template branch (default: `master`)                      |
| `--minimal`         | Core only — health, OpenAPI, response envelope           |
| `--features list`   | Comma-separated features to include                      |
| `--no-features list`| Comma-separated features to exclude (default: all on)    |

### Optional features

During setup you can pick which integrations to scaffold. Core is always included: health routes, OpenAPI at `/help`, CORS, and the JSON response envelope.

| ID          | Feature                |
| ----------- | ---------------------- |
| `auth`      | JWT authentication     |
| `postgres`  | PostgreSQL + Prisma (includes Docker Postgres) |
| `otel`      | OpenTelemetry          |
| `sentry`    | Sentry + Spotlight     |
| `kafka`     | Kafka producer/consumer|
| `redis`     | Redis cache + CRUD API |
| `websocket` | WebSocket realtime     |
| `resend`    | Resend email           |
| `cron`      | Cron jobs              |
| `docker`    | Dockerfile + Compose     |
| `cli`       | Project CLI (`kavoru module`, bin, root shims) |

Interactive mode (TTY) shows a checkbox menu (↑↓ move, Space toggle, Enter confirm). Non-interactive runs use the full stack unless you pass flags.

### Examples

```bash
# Interactive (prompts for project name + feature toggles)
bunx kavoru@latest

# Current directory
bunx kavoru@latest .

# Minimal API skeleton
bunx kavoru@latest my-api --minimal

# Pick specific features
bunx kavoru@latest my-api --features auth,postgres,otel,sentry

# Full stack minus Kafka and Docker
bunx kavoru@latest my-api --no-features kafka,docker

# Custom template fork (local dev)
bunx kavoru@latest demo --repo your-user/Kavoru --no-install
```

## Development

```bash
cd elysia-template-initializer
bun install
bun test

# Run locally without publishing
bun run src/index.ts my-test-app
# or
bun link
bunx kavoru@latest my-test-app
```

## License

MIT

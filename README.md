# kavoru (CLI)

Scaffold a new [Kavoru](https://github.com/mertthesamael/Kavoru) backend — ElysiaJS, Bun, TypeScript, Prisma, and the full production starter stack.

## Usage

After publishing to npm:

```bash
bunx kavoru my-api
cd my-api
bun run dev
```

Equivalent to `bunx --bun kavoru` (Bun runs the `kavoru` binary from the npm package).

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
| `prisma`    | Prisma + PostgreSQL    |
| `otel`      | OpenTelemetry          |
| `sentry`    | Sentry + Spotlight     |
| `kafka`     | Kafka producer/consumer|
| `websocket` | WebSocket realtime     |
| `resend`    | Resend email           |
| `cron`      | Cron jobs              |
| `docker`    | Dockerfile + Compose     |

Interactive mode (TTY) shows a checkbox menu (↑↓ move, Space toggle, Enter confirm). Non-interactive runs use the full stack unless you pass flags.

### Examples

```bash
# Interactive (prompts for project name + feature toggles)
bunx kavoru

# Current directory
bunx kavoru .

# Minimal API skeleton
bunx kavoru my-api --minimal

# Pick specific features
bunx kavoru my-api --features auth,prisma,otel,sentry

# Full stack minus Kafka and Docker
bunx kavoru my-api --no-features kafka,docker

# Custom template fork (local dev)
bunx kavoru demo --repo your-user/Kavoru --no-install
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
bunx kavoru my-test-app
```

## License

MIT

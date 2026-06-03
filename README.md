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

### Examples

```bash
# Interactive (prompts for project name)
bunx kavoru

# Current directory
bunx kavoru .

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

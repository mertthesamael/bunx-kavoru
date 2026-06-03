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

| Flag | Description |
| --- | --- |
| `-h, --help` | Show help |
| `-V, --version` | Show CLI version |
| `-f, --force` | Scaffold into a non-empty directory |
| `--no-install` | Skip `bun install` |
| `--repo owner/name` | Override template repo (default: `mertthesamael/Kavoru`) |
| `--branch name` | Template branch (default: `master`) |

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

## Publish to npm

1. Ensure the [Kavoru](https://github.com/mertthesamael/Kavoru) template repo is public on `master`.
2. Create a **Granular Access Token** at [npm → Access Tokens](https://www.npmjs.com/settings/~/tokens) with:
   - **Bypass two-factor authentication** — checked (required for first publish without 2FA)
   - **Packages** — All packages, **Read and write**
3. Configure auth (do not commit the token):

   ```bash
   echo "//registry.npmjs.org/:_authToken=YOUR_TOKEN" > ~/.npmrc
   unset NPM_CONFIG_TOKEN
   npm whoami
   ```

4. Publish: `npm publish` (or `bun publish`)

The `bin/kavoru.js` shim uses `#!/usr/bin/env bun` so `bunx kavoru` runs with Bun.

## What the CLI does

1. Shallow-clones the GitHub template (or downloads a zip if `git` is missing)
2. Removes `.git` so the new project starts fresh
3. Sets `package.json` `name`, copies `.env` from `.env.example`, and adjusts default service IDs
4. Runs `bun install` (unless `--no-install`)

## License

MIT

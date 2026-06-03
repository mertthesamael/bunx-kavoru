import { readdirSync } from "node:fs";

const NPM_NAME_RE = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9][a-z0-9-._~]*$/;

export function toPackageName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-._~@/]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function assertValidPackageName(name: string): void {
  if (!name) {
    throw new Error("Project name cannot be empty.");
  }
  if (!NPM_NAME_RE.test(name)) {
    throw new Error(
      `"${name}" is not a valid package name. Use lowercase letters, numbers, hyphens, or dots.`,
    );
  }
}

export function isDirectoryEmpty(dir: string): boolean {
  try {
    const entries = readdirSync(dir);
    const ignored = new Set([".git", ".gitignore"]);
    return entries.every((entry) => ignored.has(entry));
  } catch {
    return true;
  }
}

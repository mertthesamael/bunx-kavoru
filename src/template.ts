import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { TEMPLATE_BRANCH } from "./constants";
import { log } from "./log";

export type TemplateSource = {
  repo: string;
  branch: string;
};

function gitUrl(repo: string): string {
  return `https://github.com/${repo}.git`;
}

function zipUrl(repo: string, branch: string): string {
  return `https://github.com/${repo}/archive/refs/heads/${branch}.zip`;
}

async function commandExists(command: string): Promise<boolean> {
  const which = process.platform === "win32" ? "where" : "which";
  const proc = Bun.spawn([which, command], { stdout: "pipe", stderr: "ignore" });
  const code = await proc.exited;
  return code === 0;
}

async function runCommand(cmd: string[], cwd?: string): Promise<void> {
  const proc = Bun.spawn(cmd, {
    cwd,
    stdout: "inherit",
    stderr: "inherit",
  });
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`Command failed (${code}): ${cmd.join(" ")}`);
  }
}

async function cloneWithGit(
  source: TemplateSource,
  targetDir: string,
): Promise<void> {
  await runCommand([
    "git",
    "clone",
    "--depth",
    "1",
    "--branch",
    source.branch,
    gitUrl(source.repo),
    targetDir,
  ]);
}

async function downloadZip(
  source: TemplateSource,
  targetDir: string,
): Promise<void> {
  const url = zipUrl(source.repo, source.branch);
  const repoName = source.repo.split("/")[1] ?? "template";
  const extractedFolder = `${repoName}-${source.branch}`;

  log.step(`Downloading ${url}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download template (${response.status}): ${url}`);
  }

  const buffer = await response.arrayBuffer();
  const stamp = Date.now();
  const zipPath = path.join(path.dirname(targetDir), `.kavoru-${stamp}.zip`);
  const extractDir = path.join(path.dirname(targetDir), `.kavoru-${stamp}-extract`);

  await mkdir(path.dirname(targetDir), { recursive: true });
  await Bun.write(zipPath, buffer);

  try {
    await mkdir(extractDir, { recursive: true });

    if (process.platform === "win32") {
      await runCommand([
        "powershell",
        "-NoProfile",
        "-Command",
        `Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${extractDir.replace(/'/g, "''")}' -Force`,
      ]);
    } else {
      await runCommand(["tar", "-xf", zipPath, "-C", extractDir]);
    }

    const extractedRoot = path.join(extractDir, extractedFolder);
    await cp(extractedRoot, targetDir, { recursive: true });
  } finally {
    await rm(zipPath, { force: true }).catch(() => undefined);
    await rm(extractDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export async function fetchTemplate(
  source: TemplateSource,
  targetDir: string,
): Promise<void> {
  await mkdir(path.dirname(targetDir), { recursive: true });

  if (await commandExists("git")) {
    log.step(`Cloning ${source.repo} (${source.branch})`);
    await cloneWithGit(source, targetDir);
    return;
  }

  log.warn("git not found — downloading template as zip");
  await downloadZip(source, targetDir);
}

export async function removeGitMetadata(projectDir: string): Promise<void> {
  await rm(path.join(projectDir, ".git"), { recursive: true, force: true });
}

export async function customizeProject(
  projectDir: string,
  packageName: string,
): Promise<void> {
  const pkgPath = path.join(projectDir, "package.json");
  const pkgFile = Bun.file(pkgPath);
  if (!(await pkgFile.exists())) {
    throw new Error("Template is missing package.json");
  }

  const pkg = (await pkgFile.json()) as Record<string, unknown>;
  pkg.name = packageName;
  await Bun.write(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

  const envExamplePath = path.join(projectDir, ".env.example");
  const envExample = Bun.file(envExamplePath);
  if (await envExample.exists()) {
    let envText = await envExample.text();
    envText = envText
      .replace(/^OTEL_SERVICE_NAME=kavoru$/m, `OTEL_SERVICE_NAME=${packageName}`)
      .replace(/^KAFKA_CLIENT_ID=kavoru$/m, `KAFKA_CLIENT_ID=${packageName}`)
      .replace(
        /^KAFKA_GROUP_ID=kavoru-consumer$/m,
        `KAFKA_GROUP_ID=${packageName}-consumer`,
      );
    await Bun.write(envExamplePath, envText);
    await Bun.write(path.join(projectDir, ".env"), envText);
  }

  const modulesIndex = path.join(projectDir, "src", "modules", "index.ts");
  const modulesFile = Bun.file(modulesIndex);
  if (await modulesFile.exists()) {
    const text = await modulesFile.text();
    const title = packageName
      .replace(/-/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
    await Bun.write(
      modulesIndex,
      text.replace('title: "🦊 Kavoru"', `title: "🦊 ${title}"`),
    );
  }
}

export async function installDependencies(projectDir: string): Promise<void> {
  log.step("Installing dependencies (bun install)");
  await runCommand(["bun", "install"], projectDir);
}

export function resolveTemplateSource(
  repo: string,
  branch: string,
): TemplateSource {
  return { repo, branch: branch || TEMPLATE_BRANCH };
}

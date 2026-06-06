import { stdin, stdout } from "node:process";
import {
  ALL_FEATURES,
  FEATURES,
  MINIMAL_FEATURES,
  normalizeFeatureSelection,
  type FeatureId,
  type FeatureSelection,
  formatFeatureSelection,
} from "./features";

const ESC = "\x1b";
const dim = `${ESC}[2m`;
const reset = `${ESC}[0m`;
const cyan = `${ESC}[36m`;

function cloneSelection(selection: FeatureSelection): FeatureSelection {
  return { ...selection };
}

type KeyAction =
  | "up"
  | "down"
  | "toggle"
  | "confirm"
  | "all"
  | "minimal"
  | "interrupt";

const KEY_UP = ESC + "[A";
const KEY_DOWN = ESC + "[B";
const KEY_UP_ALT = ESC + "OA";
const KEY_DOWN_ALT = ESC + "OB";

function parseKeyInput(data: string): KeyAction | null {
  if (data === "\u0003") return "interrupt";
  if (data === "\r" || data === "\n") return "confirm";
  if (data === " ") return "toggle";
  if (data === "a" || data === "A") return "all";
  if (data === "m" || data === "M") return "minimal";
  if (data === KEY_UP || data === KEY_UP_ALT) return "up";
  if (data === KEY_DOWN || data === KEY_DOWN_ALT) return "down";
  return null;
}

function createKeyReader(onKey: (action: KeyAction) => void) {
  let pending = "";

  const onData = (chunk: string) => {
    pending += chunk;

    while (pending.length > 0) {
      if (pending === ESC) return;

      if (pending.startsWith(ESC)) {
        if (pending.length < 3) return;

        const action = parseKeyInput(pending.slice(0, 3));
        if (action) {
          pending = pending.slice(3);
          onKey(action);
          continue;
        }

        if (pending.startsWith(ESC + "O") && pending.length < 3) return;

        pending = pending.slice(1);
        continue;
      }

      const action = parseKeyInput(pending[0] ?? "");
      pending = pending.slice(1);
      if (action) onKey(action);
    }
  };

  return onData;
}

function renderCheckboxMenu(
  selection: FeatureSelection,
  activeIndex: number,
  lineCount: number,
): number {
  const lines: string[] = [
    `${cyan}◆${reset} Select optional features ${dim}(↑↓ move · Space toggle · Enter confirm)${reset}`,
    `${dim}  a = all · m = minimal${reset}`,
    "",
  ];

  FEATURES.forEach((feature, index) => {
    const isActive = index === activeIndex;
    const pointer = isActive ? `${cyan}❯${reset}` : " ";
    const mark = selection[feature.id] ? "x" : " ";
    const label = isActive ? `${cyan}${feature.label}${reset}` : feature.label;
    lines.push(
      ` ${pointer} [${mark}] ${label.padEnd(22)} ${dim}${feature.description}${reset}`,
    );
  });

  lines.push("", ` ${dim}Selected: ${formatFeatureSelection(selection)}${reset}`);

  if (lineCount > 0) {
    stdout.write(`${ESC}[${lineCount}A`);
  }

  for (const line of lines) {
    stdout.write(`${ESC}[2K${ESC}[0G${line}\n`);
  }

  return lines.length;
}

function restoreTerminal(onData: (chunk: string) => void) {
  stdin.off("data", onData);
  if (stdin.isTTY) {
    stdin.setRawMode(false);
  }
  stdin.pause();
  stdout.write(`${ESC}[?25h`);
}

export async function promptFeatureSelection(
  initial: FeatureSelection = ALL_FEATURES,
): Promise<FeatureSelection> {
  if (!stdin.isTTY || !stdout.isTTY) {
    return cloneSelection(initial);
  }

  const selection = cloneSelection(initial);
  let activeIndex = 0;
  let lineCount = 0;

  stdout.write(`${ESC}[?25l`);

  if (stdin.isTTY) {
    stdin.setRawMode(true);
  }
  stdin.resume();
  stdin.setEncoding("utf8");

  return new Promise((resolve, reject) => {
    const onKey = (action: KeyAction) => {
      switch (action) {
        case "up":
          activeIndex =
            (activeIndex - 1 + FEATURES.length) % FEATURES.length;
          lineCount = renderCheckboxMenu(selection, activeIndex, lineCount);
          break;
        case "down":
          activeIndex = (activeIndex + 1) % FEATURES.length;
          lineCount = renderCheckboxMenu(selection, activeIndex, lineCount);
          break;
        case "toggle": {
          const feature = FEATURES[activeIndex];
          if (!feature) break;
          selection[feature.id as FeatureId] = !selection[feature.id as FeatureId];
          if (feature.id === "postgres" && selection.postgres) {
            selection.docker = true;
          }
          if (feature.id === "docker" && !selection.docker) {
            selection.postgres = false;
          }
          lineCount = renderCheckboxMenu(selection, activeIndex, lineCount);
          break;
        }
        case "all":
          Object.assign(selection, ALL_FEATURES);
          lineCount = renderCheckboxMenu(selection, activeIndex, lineCount);
          break;
        case "minimal":
          Object.assign(selection, MINIMAL_FEATURES);
          lineCount = renderCheckboxMenu(selection, activeIndex, lineCount);
          break;
        case "confirm":
          Object.assign(selection, normalizeFeatureSelection(selection));
          restoreTerminal(onData);
          stdout.write("\n");
          resolve(selection);
          break;
        case "interrupt":
          restoreTerminal(onData);
          stdout.write("\n");
          reject(new Error("Feature selection cancelled."));
          break;
      }
    };

    const onData = createKeyReader(onKey);
    stdin.on("data", onData);
    lineCount = renderCheckboxMenu(selection, activeIndex, 0);
  });
}

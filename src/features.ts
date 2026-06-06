import { rm } from "node:fs/promises";
import path from "node:path";
import { log } from "./log";

export type FeatureId =
  | "auth"
  | "prisma"
  | "otel"
  | "sentry"
  | "kafka"
  | "websocket"
  | "resend"
  | "cron"
  | "docker";

export type FeatureSelection = Record<FeatureId, boolean>;

export type FeatureDef = {
  id: FeatureId;
  label: string;
  description: string;
};

export const FEATURES: FeatureDef[] = [
  {
    id: "auth",
    label: "JWT Authentication",
    description: "Bearer auth, sign-in route, protected routes",
  },
  {
    id: "prisma",
    label: "Prisma + PostgreSQL",
    description: "Prisma 7 config, migrations, seed scripts",
  },
  {
    id: "otel",
    label: "OpenTelemetry",
    description: "OTLP tracing with Bun-compatible exporter",
  },
  {
    id: "sentry",
    label: "Sentry + Spotlight",
    description: "Error monitoring and local Spotlight UI",
  },
  {
    id: "kafka",
    label: "Kafka",
    description: "Producer, consumer, and example HTTP endpoints",
  },
  {
    id: "websocket",
    label: "WebSockets",
    description: "Validated real-time connections with rooms",
  },
  {
    id: "resend",
    label: "Resend Email",
    description: "Transactional email via sendEmail()",
  },
  {
    id: "cron",
    label: "Cron Jobs",
    description: "Scheduled tasks via @elysiajs/cron",
  },
  {
    id: "docker",
    label: "Docker",
    description: "Dockerfile and Docker Compose stack",
  },
];

export const FEATURE_IDS = FEATURES.map((feature) => feature.id);

export const ALL_FEATURES: FeatureSelection = Object.fromEntries(
  FEATURE_IDS.map((id) => [id, true]),
) as FeatureSelection;

export const MINIMAL_FEATURES: FeatureSelection = Object.fromEntries(
  FEATURE_IDS.map((id) => [id, false]),
) as FeatureSelection;

const FEATURE_PATHS: Record<FeatureId, string[]> = {
  auth: [
    "src/modules/signin",
    "src/modules/protected",
    "src/middleware/auth.ts",
    "src/infra/auth",
    "src/constants/jwt.ts",
    "src/models/schemas/signin.ts",
  ],
  prisma: ["prisma.config.ts", "src/infra/prisma"],
  otel: ["src/infra/telemetry"],
  sentry: [
    "src/infra/sentry",
    "src/constants/sentry.ts",
    "__tests__/sentry.test.ts",
  ],
  kafka: [
    "src/modules/kafka",
    "src/infra/kafka",
    "src/models/schemas/kafka.ts",
    "__tests__/kafka.test.ts",
  ],
  websocket: [
    "src/modules/realtime",
    "src/models/schemas/realtime.ts",
    "__tests__/realtime.test.ts",
  ],
  resend: ["src/infra/resend"],
  cron: ["src/schedules"],
  docker: ["Dockerfile", "docker-compose.yaml"],
};

const FEATURE_DEPENDENCIES: Partial<
  Record<FeatureId, { dependencies?: string[]; devDependencies?: string[] }>
> = {
  auth: { dependencies: ["@elysiajs/bearer", "@elysiajs/jwt"] },
  prisma: {
    dependencies: ["@prisma/adapter-pg", "@prisma/client"],
    devDependencies: ["prisma"],
  },
  otel: {
    dependencies: [
      "@elysiajs/opentelemetry",
      "@opentelemetry/exporter-trace-otlp-http",
      "@opentelemetry/otlp-transformer",
      "@opentelemetry/sdk-trace-node",
    ],
  },
  sentry: { dependencies: ["@sentry/elysia"] },
  kafka: { dependencies: ["kafkajs"] },
  resend: { dependencies: ["resend"] },
  cron: { dependencies: ["@elysiajs/cron"] },
};

const FEATURE_SCRIPTS: Partial<Record<FeatureId, string[]>> = {
  otel: ["otel:view", "otel:tui"],
  sentry: ["sentry:spotlight"],
  prisma: ["seed"],
};

function enabledFeatures(selection: FeatureSelection): FeatureId[] {
  return FEATURE_IDS.filter((id) => selection[id]);
}

function disabledFeatures(selection: FeatureSelection): FeatureId[] {
  return FEATURE_IDS.filter((id) => !selection[id]);
}

export function parseFeatureIncludeList(input: string): FeatureSelection {
  const normalized = input.trim().toLowerCase();
  if (!normalized || normalized === "all") return { ...ALL_FEATURES };
  if (normalized === "minimal" || normalized === "none") {
    return { ...MINIMAL_FEATURES };
  }

  const requested = normalized
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const unknown = requested.filter(
    (id) => !FEATURE_IDS.includes(id as FeatureId),
  );
  if (unknown.length > 0) {
    throw new Error(
      `Unknown feature(s): ${unknown.join(", ")}. Valid: ${FEATURE_IDS.join(", ")}`,
    );
  }

  const selection = { ...MINIMAL_FEATURES };
  for (const id of requested) {
    selection[id as FeatureId] = true;
  }
  return selection;
}

export function parseFeatureExcludeList(
  excluded: string[],
  base: FeatureSelection = ALL_FEATURES,
): FeatureSelection {
  const selection = { ...base };
  const unknown: string[] = [];

  for (const raw of excluded) {
    const id = raw.trim().toLowerCase();
    if (!id) continue;
    if (!FEATURE_IDS.includes(id as FeatureId)) {
      unknown.push(id);
      continue;
    }
    selection[id as FeatureId] = false;
  }

  if (unknown.length > 0) {
    throw new Error(
      `Unknown feature(s): ${unknown.join(", ")}. Valid: ${FEATURE_IDS.join(", ")}`,
    );
  }

  return selection;
}

export function formatFeatureSelection(selection: FeatureSelection): string {
  const enabled = enabledFeatures(selection);
  if (enabled.length === 0) return "core only";
  return enabled.join(", ");
}

async function removePaths(projectDir: string, relativePaths: string[]) {
  for (const relativePath of relativePaths) {
    await rm(path.join(projectDir, relativePath), {
      recursive: true,
      force: true,
    });
  }
}

async function readText(projectDir: string, relativePath: string) {
  const file = Bun.file(path.join(projectDir, relativePath));
  if (!(await file.exists())) return null;
  return file.text();
}

async function writeText(
  projectDir: string,
  relativePath: string,
  content: string,
) {
  await Bun.write(path.join(projectDir, relativePath), content);
}

function removeImportLines(content: string, modules: string[]) {
  let next = content;
  for (const modulePath of modules) {
    const escaped = modulePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    next = next.replace(
      new RegExp(`^import .* from ["']${escaped}["'];?\\r?\\n`, "gm"),
      "",
    );
  }
  return next;
}

function removeUseLines(content: string, identifiers: string[]) {
  let next = content;
  for (const identifier of identifiers) {
    next = next.replace(
      new RegExp(`^\\s*\\.use\\(${identifier}\\)\\r?\\n`, "gm"),
      "",
    );
  }
  return next;
}

async function patchModulesIndex(
  projectDir: string,
  selection: FeatureSelection,
) {
  const relativePath = "src/modules/index.ts";
  const current = await readText(projectDir, relativePath);
  if (!current) return;

  let content = current;
  if (!selection.sentry) {
    content = removeImportLines(content, ["../infra/sentry"]);
    content = removeUseLines(content, ["withSentry"]);
  }
  if (!selection.otel) {
    content = removeImportLines(content, ["../infra/telemetry"]);
    content = removeUseLines(content, ["withOpenTelemetry"]);
  }

  content = content.replace(/app\s+\.use\(/g, "app\n    .use(");

  await writeText(projectDir, relativePath, content);
}

async function patchEntryIndex(projectDir: string, selection: FeatureSelection) {
  const imports = [
    selection.sentry
      ? 'import { initSentry, flushSentry } from "./infra/sentry";'
      : null,
    selection.kafka
      ? 'import { startKafka, stopKafka } from "./infra/kafka";'
      : null,
    'import { HttpServer } from "./server/index";',
    'import { logger } from "./common/logger";',
    selection.kafka ? 'import { InternalServerError } from "elysia";' : null,
  ].filter(Boolean) as string[];

  const body: string[] = [];

  if (selection.sentry) {
    body.push("", "initSentry();");
  }

  body.push("", "const server = new HttpServer();", "");

  if (selection.kafka) {
    body.push(
      "void server.start().then(async () => {",
      "  try {",
      "    await startKafka();",
      "  } catch (error) {",
      '    logger.error("Failed to start Kafka", { error });',
      '    throw new InternalServerError("Failed to start Kafka");',
      "  }",
      "});",
    );
  } else {
    body.push("void server.start();");
  }

  body.push(
    "",
    "const shutdown = (signal: string) => {",
    "  return async () => {",
    "    logger.warn(`Received ${signal}, shutting down`);",
    "    await server.stop();",
  );

  if (selection.kafka) {
    body.push("    await stopKafka();");
  }
  if (selection.sentry) {
    body.push("    await flushSentry();");
  }

  body.push(
    "    process.exit(0);",
    "  };",
    "};",
    "",
    'process.on("SIGINT", () => void shutdown("SIGINT")());',
    'process.on("SIGTERM", () => void shutdown("SIGTERM")());',
    "",
  );

  await writeText(projectDir, "src/index.ts", [...imports, ...body].join("\n"));
}

async function patchServerIndex(projectDir: string, selection: FeatureSelection) {
  const relativePath = "src/server/index.ts";
  const current = await readText(projectDir, relativePath);
  if (!current) return;

  let content = current;

  if (selection.cron) {
    content = content.replace(
      /\/\/import \{ schedules \} from "\.\.\/schedules";.*\n/,
      'import { schedules } from "../schedules";\n',
    );
    content = content.replace(
      /\/\/\.use\(schedules\);.*\n/,
      "    .use(schedules);\n",
    );
  } else {
    content = content.replace(
      /^import \{ schedules \} from "\.\.\/schedules";\n/m,
      "",
    );
    content = content.replace(/^\s*\.use\(schedules\);\n/m, "");
  }

  if (!selection.websocket) {
    content = content.replace(
      /new Elysia\(\{\s*websocket:\s*\{\s*idleTimeout:\s*120,\s*\},\s*\}\)/,
      "new Elysia()",
    );
  }

  await writeText(projectDir, relativePath, content);
}

async function patchPackageJson(
  projectDir: string,
  selection: FeatureSelection,
) {
  const pkgPath = path.join(projectDir, "package.json");
  const pkgFile = Bun.file(pkgPath);
  if (!(await pkgFile.exists())) return;

  const pkg = (await pkgFile.json()) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    scripts?: Record<string, string>;
  };

  for (const featureId of disabledFeatures(selection)) {
    const deps = FEATURE_DEPENDENCIES[featureId];
    if (deps?.dependencies) {
      for (const name of deps.dependencies) {
        delete pkg.dependencies?.[name];
      }
    }
    if (deps?.devDependencies) {
      for (const name of deps.devDependencies) {
        delete pkg.devDependencies?.[name];
      }
    }

    const scripts = FEATURE_SCRIPTS[featureId];
    if (scripts) {
      for (const scriptName of scripts) {
        delete pkg.scripts?.[scriptName];
      }
    }
  }

  if (!selection.prisma && pkg.scripts) {
    pkg.scripts.start = "bun run src/index.ts";
  }

  await Bun.write(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

export function buildEnvExample(
  packageName: string,
  selection: FeatureSelection,
): string {
  const lines = ["NODE_ENV=development", "PORT=3131", ""];

  if (selection.prisma) {
    lines.push(
      "DATABASE_URL=postgresql://user:password@localhost:5432/your_database",
      "",
    );
  }

  if (selection.otel) {
    lines.push(
      "# OpenTelemetry (optional in production; enabled by default in development)",
      "# Terminal 1: bun run otel:view",
      "# Terminal 2: bun run dev",
      "# Disable locally: OTEL_EXPORTER_OTLP_ENDPOINT=",
      "OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces",
      `OTEL_SERVICE_NAME=${packageName}`,
      "",
    );
  }

  if (selection.sentry) {
    lines.push(
      "# Sentry Spotlight (local UI — enabled by default in development)",
      "# Terminal 1: bun run sentry:spotlight",
      "# Terminal 2: bun run dev",
      "# Disable locally: SENTRY_SPOTLIGHT=false",
      "SENTRY_SPOTLIGHT=true",
      "",
      "# Sentry cloud (optional — events also go to sentry.io when set)",
      "# SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0",
      "# SENTRY_TRACES_SAMPLE_RATE=1.0",
      "",
    );
  }

  if (selection.kafka) {
    lines.push(
      "# Kafka (enabled by default in development; disabled in test)",
      "# Start broker: docker compose up -d kafka",
      "# Host dev uses EXTERNAL listener on port 9094",
      "# KAFKA_ENABLED=false",
      "KAFKA_BROKERS=localhost:9094",
      `KAFKA_CLIENT_ID=${packageName}`,
      `KAFKA_GROUP_ID=${packageName}-consumer`,
      "KAFKA_TOPIC=elysia.events",
      "",
    );
  }

  if (selection.resend) {
    lines.push(
      "# Resend (disabled when RESEND_API_KEY is unset; always disabled in test)",
      "# Create an API key: https://resend.com/api-keys",
      "# RESEND_ENABLED=false",
      "# RESEND_API_KEY=re_xxxxxxxx",
      "# RESEND_FROM=Acme <onboarding@resend.dev>",
      "",
    );
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

async function patchEnvExample(
  projectDir: string,
  selection: FeatureSelection,
  packageName = "kavoru",
) {
  const content = buildEnvExample(packageName, selection);
  await writeText(projectDir, ".env.example", content);
  await writeText(projectDir, ".env", content);
}

async function patchDockerfile(projectDir: string, selection: FeatureSelection) {
  if (!selection.docker) return;

  const relativePath = "Dockerfile";
  const current = await readText(projectDir, relativePath);
  if (!current) return;

  let content = current;
  if (!selection.prisma) {
    content = content.replace(/^\s*COPY prisma\.config\.ts \.\/.*\n/m, "");
    content = content.replace(
      /^\s*# generate only needs the schema on disk, not a live database\n/m,
      "",
    );
    content = content.replace(
      /^\s*RUN if \[ -f src\/infra\/prisma\/schemas\/schema\.prisma \]; then bunx prisma generate; fi\n/m,
      "",
    );
  }

  await writeText(projectDir, relativePath, content);
}

function buildAppEnvironment(selection: FeatureSelection): string {
  const lines = ["      NODE_ENV: production"];
  if (selection.kafka) {
    lines.push("      KAFKA_BROKERS: kafka:9092");
  }
  if (selection.otel) {
    lines.push("      OTEL_EXPORTER_OTLP_ENDPOINT: http://jaeger:4318/v1/traces");
  }
  return `    environment:\n${lines.join("\n")}\n`;
}

function generateDockerCompose(selection: FeatureSelection): string {
  const appDependsOn = selection.kafka
    ? `    depends_on:
      kafka:
        condition: service_started
`
    : "";
  const appEnvironment = buildAppEnvironment(selection);

  const kafkaService = selection.kafka
    ? `
  kafka:
    image: confluentinc/cp-kafka:7.6.1
    hostname: kafka
    ports:
      - "9094:9094"
    environment:
      CLUSTER_ID: MkU3OEVBNTcwNTJENDM2Qk
      KAFKA_NODE_ID: "0"
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_LISTENERS: PLAINTEXT://:9092,CONTROLLER://:9093,EXTERNAL://:9094
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092,EXTERNAL://localhost:9094
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT,EXTERNAL:PLAINTEXT
      KAFKA_CONTROLLER_QUORUM_VOTERS: 0@kafka:9093
      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 1
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 1
      KAFKA_LOG_DIRS: /tmp/kraft-combined-logs
    networks:
      - app_network
    restart: unless-stopped
`
    : "";

  const jaegerService = selection.otel
    ? `
  jaeger:
    image: jaegertracing/all-in-one:1.62.0
    ports:
      - "16686:16686"
      - "4318:4318"
    environment:
      COLLECTOR_OTLP_ENABLED: "true"
    networks:
      - app_network
    restart: unless-stopped
`
    : "";

  return `services:
  app:
    build:
      context: .
      target: build
      args:
        PORT: \${PORT:-3131}
    command: /app/server
    volumes:
      - ./src:/app/src
    networks:
      app_network:
        aliases:
          - app
    extra_hosts:
      - "host.docker.internal:host-gateway"
    expose:
      - "\${PORT}"
    restart: unless-stopped
    env_file:
      - .env
${appDependsOn}${appEnvironment}    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:\${PORT}/healthz"]
      interval: 600s
      timeout: 300s
      retries: 1
      start_period: 40s
${kafkaService}${jaegerService}
networks:
  app_network:
    driver: bridge
`;
}

async function patchDockerCompose(
  projectDir: string,
  selection: FeatureSelection,
) {
  if (!selection.docker) return;
  await writeText(projectDir, "docker-compose.yaml", generateDockerCompose(selection));
}

export async function applyFeatures(
  projectDir: string,
  selection: FeatureSelection,
  packageName = "kavoru",
): Promise<void> {
  const disabled = disabledFeatures(selection);
  log.step(`Applying feature selection (${formatFeatureSelection(selection)})`);

  for (const featureId of disabled) {
    await removePaths(projectDir, FEATURE_PATHS[featureId]);
  }

  await patchModulesIndex(projectDir, selection);
  await patchEntryIndex(projectDir, selection);
  await patchServerIndex(projectDir, selection);
  await patchPackageJson(projectDir, selection);
  await patchEnvExample(projectDir, selection, packageName);
  await patchDockerfile(projectDir, selection);
  await patchDockerCompose(projectDir, selection);

  if (disabled.length > 0) {
    log.success("Feature selection applied");
  }
}

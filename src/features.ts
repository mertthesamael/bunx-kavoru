import { rm } from "node:fs/promises";
import path from "node:path";
import { log } from "./log";

export type FeatureId =
  | "auth"
  | "postgres"
  | "otel"
  | "sentry"
  | "kafka"
  | "redis"
  | "websocket"
  | "resend"
  | "cron"
  | "cli";

/** Always scaffolded — not a CLI toggle. */
export const ALWAYS_INCLUDED = ["docker"] as const;

const FEATURE_ALIASES: Record<string, FeatureId> = {
  prisma: "postgres",
  "kavoru-cli": "cli",
};

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
    id: "postgres",
    label: "PostgreSQL",
    description: "Docker Postgres, Prisma 7, migrations, and seed",
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
    id: "redis",
    label: "Redis",
    description: "Cache client and CRUD HTTP endpoints",
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
    id: "cli",
    label: "Project CLI",
    description: "kavoru module command, bin, and module scaffolds",
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
  postgres: ["prisma.config.ts", "src/infra/prisma"],
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
  redis: [
    "src/modules/redis",
    "src/infra/redis",
    "src/models/schemas/redis.ts",
    "__tests__/redis.test.ts",
  ],
  websocket: [
    "src/modules/realtime",
    "src/models/schemas/realtime.ts",
    "__tests__/realtime.test.ts",
  ],
  resend: ["src/infra/resend"],
  cron: ["src/schedules"],
  cli: [
    "bin/kavoru.js",
    "kavoru",
    "kavoru.cmd",
    "scripts/kavoru-cli.ts",
    "scripts/generate-module.ts",
    "scripts/generate-repository.ts",
    "scripts/link-cli.ts",
    "__tests__/generate-module.test.ts",
    "__tests__/generate-repository.test.ts",
    "__tests__/kavoru-cli.test.ts",
    "__tests__/link-cli.test.ts",
  ],
};

const FEATURE_DEPENDENCIES: Partial<
  Record<FeatureId, { dependencies?: string[]; devDependencies?: string[] }>
> = {
  auth: { dependencies: ["@elysiajs/bearer", "@elysiajs/jwt"] },
  postgres: {
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
  redis: { dependencies: ["ioredis"] },
  resend: { dependencies: ["resend"] },
  cron: { dependencies: ["@elysiajs/cron"] },
};

const FEATURE_SCRIPTS: Partial<Record<FeatureId, string[]>> = {
  otel: ["otel:view", "otel:tui"],
  sentry: ["sentry:spotlight"],
  postgres: ["seed"],
  cli: ["link-cli"],
};

function resolveFeatureId(raw: string): FeatureId | null {
  const id = FEATURE_ALIASES[raw] ?? raw;
  return FEATURE_IDS.includes(id as FeatureId) ? (id as FeatureId) : null;
}

export function toPostgresName(packageName: string): string {
  const normalized = packageName
    .replace(/-/g, "_")
    .replace(/[^a-z0-9_]/gi, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return normalized || "app";
}

export function buildDatabaseUrl(
  packageName: string,
  host: string,
  port = 5432,
): string {
  const name = toPostgresName(packageName);
  return `postgresql://${name}:${name}@${host}:${port}/${name}`;
}

export function buildRedisCredentials(packageName: string): {
  username: string;
  password: string;
} {
  const name = toPostgresName(packageName);
  return { username: name, password: name };
}

export function normalizeFeatureSelection(
  selection: FeatureSelection,
): FeatureSelection {
  return { ...selection };
}

function rejectReservedFeatureToggle(parts: string[], action: "include" | "exclude") {
  const reserved = parts.filter((part) =>
    ALWAYS_INCLUDED.includes(part as (typeof ALWAYS_INCLUDED)[number]),
  );
  if (reserved.length === 0) return;

  const verb = action === "exclude" ? "disable" : "toggle";
  throw new Error(
    `Docker is always included and cannot be ${verb}. Omit "docker" from --features / --no-features.`,
  );
}

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

  rejectReservedFeatureToggle(requested, "include");

  const unknown = requested.filter((part) => resolveFeatureId(part) === null);
  if (unknown.length > 0) {
    throw new Error(
      `Unknown feature(s): ${unknown.join(", ")}. Valid: ${FEATURE_IDS.join(", ")}`,
    );
  }

  const selection = { ...MINIMAL_FEATURES };
  for (const part of requested) {
    const id = resolveFeatureId(part);
    if (id) selection[id] = true;
  }
  return selection;
}

export function parseFeatureExcludeList(
  excluded: string[],
  base: FeatureSelection = ALL_FEATURES,
): FeatureSelection {
  const selection = { ...base };
  const unknown: string[] = [];

  rejectReservedFeatureToggle(
    excluded.map((part) => part.trim().toLowerCase()).filter(Boolean),
    "exclude",
  );

  for (const raw of excluded) {
    const part = raw.trim().toLowerCase();
    if (!part) continue;
    const id = resolveFeatureId(part);
    if (!id) {
      unknown.push(part);
      continue;
    }
    selection[id] = false;
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

export function buildEntryIndex(selection: FeatureSelection): string {
  const needsAsyncStartup = selection.kafka || selection.redis;

  const imports = [
    selection.sentry
      ? 'import { initSentry, flushSentry } from "./infra/sentry";'
      : null,
    selection.otel
      ? 'import {\n  bootstrapOpenTelemetry,\n  shutdownOpenTelemetry,\n} from "./infra/telemetry";'
      : null,
    selection.kafka
      ? 'import { startKafka, stopKafka } from "./infra/kafka";'
      : null,
    selection.redis
      ? 'import { connectRedis, stopRedis } from "./infra/redis";'
      : null,
    'import { HttpServer } from "./server/index";',
    'import { logger } from "./common/logger";',
    needsAsyncStartup ? 'import { InternalServerError } from "elysia";' : null,
  ].filter(Boolean) as string[];

  const body: string[] = [];

  if (selection.otel) {
    body.push("", "bootstrapOpenTelemetry();");
  }
  if (selection.sentry) {
    body.push("initSentry();");
  }

  body.push("", "const server = new HttpServer();", "");

  if (needsAsyncStartup) {
    const startupCalls: string[] = [];
    if (selection.kafka) startupCalls.push("    await startKafka();");
    if (selection.redis) startupCalls.push("    await connectRedis();");

    body.push(
      "void server.start().then(async () => {",
      "  try {",
      ...startupCalls,
      "  } catch (error) {",
      '    logger.error("Failed to start infrastructure", { error });',
      '    throw new InternalServerError("Failed to start infrastructure");',
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
  if (selection.redis) {
    body.push("    await stopRedis();");
  }
  if (selection.sentry) {
    body.push("    await flushSentry();");
  }
  if (selection.otel) {
    body.push("    await shutdownOpenTelemetry();");
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

  return [...imports, ...body].join("\n");
}

async function patchEntryIndex(
  projectDir: string,
  selection: FeatureSelection,
) {
  await writeText(projectDir, "src/index.ts", buildEntryIndex(selection));
}

async function patchServerIndex(
  projectDir: string,
  selection: FeatureSelection,
) {
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
    bin?: Record<string, string>;
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

  if (!selection.postgres && pkg.scripts) {
    pkg.scripts.start = "bun run src/index.ts";
  }

  if (!selection.cli) {
    delete pkg.bin;
    if (pkg.scripts?.postinstall === "bun scripts/link-cli.ts") {
      delete pkg.scripts.postinstall;
    }
  } else {
    pkg.bin = { kavoru: "./bin/kavoru.js" };
    pkg.scripts ??= {};
    pkg.scripts.postinstall = "bun scripts/link-cli.ts";
  }

  await Bun.write(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

export function buildEnvExample(
  packageName: string,
  selection: FeatureSelection,
): string {
  const lines = ["NODE_ENV=development", "PORT=3131", ""];

  if (selection.postgres) {
    lines.push(
      "# Start database: docker compose up -d postgres",
      "# Host dev uses published port; Docker app overrides host in docker/app/.env",
      `DATABASE_URL=${buildDatabaseUrl(packageName, "localhost")}`,
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

  if (selection.redis) {
    const { username, password } = buildRedisCredentials(packageName);
    lines.push(
      "# Redis (enabled by default in development; disabled in test)",
      "# Start server: docker compose up -d redis",
      "# REDIS_ENABLED=false",
      "REDIS_URL=redis://localhost:6379",
      `REDIS_USERNAME=${username}`,
      `REDIS_PASSWORD=${password}`,
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

async function patchDockerfile(
  projectDir: string,
  selection: FeatureSelection,
) {
  const relativePath = "docker/app/Dockerfile";
  const current = await readText(projectDir, relativePath);
  if (!current) return;

  let content = current;
  if (!selection.postgres) {
    content = content.replace(/^\s*COPY prisma\.config\.ts \.\/.*\n/m, "");
    content = content.replace(/^\s*RUN bunx prisma generate\n/m, "");
    content = content.replace(
      /^COPY docker\/app\/docker-entrypoint\.sh .*$\n/m,
      "",
    );
    content = content.replace(
      /^RUN sed -i 's\/\\r\$\/\/' \/app\/docker-entrypoint\.sh && chmod \+x \/app\/docker-entrypoint\.sh\n/m,
      "",
    );
    content = content.replace(
      /^ENTRYPOINT \["\/bin\/sh", "\/app\/docker-entrypoint\.sh"\]\n/m,
      "",
    );
  }

  if (!selection.cli) {
    content = content.replace(/^COPY bin \.\/bin\n/m, "");
    content = content.replace(
      /^COPY scripts\/link-cli\.ts \.\/scripts\/link-cli\.ts\n/m,
      "",
    );
    content = content.replace(/^ENV PATH="\/root\/\.bun\/bin:\$\{PATH\}"\n/m, "");
  }

  await writeText(projectDir, relativePath, content);
}

function buildDockerRedisEnv(packageName: string): string {
  const { username, password } = buildRedisCredentials(packageName);
  return `REDIS_USERNAME=${username}
REDIS_PASSWORD=${password}
`;
}

const DOCKER_KAFKA_ENV = `# KRaft broker config (Confluent cp-kafka 7.6.1)
CLUSTER_ID=MkU3OEVBNTcwNTJENDM2Qk
KAFKA_NODE_ID=0
KAFKA_PROCESS_ROLES=broker,controller
KAFKA_LISTENERS=PLAINTEXT://:9092,CONTROLLER://:9093,EXTERNAL://:9094
KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://kafka:9092,EXTERNAL://localhost:9094
KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT,EXTERNAL:PLAINTEXT
KAFKA_CONTROLLER_QUORUM_VOTERS=0@kafka:9093
KAFKA_CONTROLLER_LISTENER_NAMES=CONTROLLER
KAFKA_INTER_BROKER_LISTENER_NAME=PLAINTEXT
KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1
KAFKA_TRANSACTION_STATE_LOG_MIN_ISR=1
KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR=1
KAFKA_LOG_DIRS=/tmp/kraft-combined-logs
`;

const DOCKER_OTEL_ENV =
  "# otel-dev runs with CLI flags in Dockerfile; add overrides here if needed.\n";

const DOCKER_SPOTLIGHT_ENV =
  "# Official Spotlight image; add overrides here if needed.\n";

function buildDockerPostgresEnv(packageName: string): string {
  const name = toPostgresName(packageName);
  return `POSTGRES_USER=${name}
POSTGRES_PASSWORD=${name}
POSTGRES_DB=${name}
`;
}

function buildDockerAppEnv(
  selection: FeatureSelection,
  packageName: string,
): string {
  const lines = [
    "# Docker-only overrides (loaded after root .env)",
    "NODE_ENV=production",
  ];
  if (selection.postgres) {
    lines.push(`DATABASE_URL=${buildDatabaseUrl(packageName, "postgres")}`);
  }
  if (selection.kafka) {
    lines.push("KAFKA_BROKERS=kafka:9092");
  }
  if (selection.redis) {
    const { username, password } = buildRedisCredentials(packageName);
    lines.push("REDIS_URL=redis://redis:6379");
    lines.push(`REDIS_USERNAME=${username}`);
    lines.push(`REDIS_PASSWORD=${password}`);
  }
  if (selection.otel) {
    lines.push("OTEL_EXPORTER_OTLP_ENDPOINT=http://otel:4318/v1/traces");
  }
  if (selection.sentry) {
    lines.push("SENTRY_SPOTLIGHT=http://spotlight:8969/stream");
  }
  return `${lines.join("\n")}\n`;
}

function buildAppDependsOn(selection: FeatureSelection): string {
  const deps: string[] = [];
  if (selection.postgres) {
    deps.push(`      postgres:
        condition: service_healthy`);
  }
  if (selection.kafka) {
    deps.push(`      kafka:
        condition: service_started`);
  }
  if (selection.redis) {
    deps.push(`      redis:
        condition: service_healthy`);
  }
  if (deps.length === 0) return "";
  return `    depends_on:
${deps.join("\n")}
`;
}

function generateDockerCompose(selection: FeatureSelection): string {
  const appDependsOn = buildAppDependsOn(selection);

  const postgresService = selection.postgres
    ? `
  postgres:
    build:
      context: docker/postgres
    hostname: postgres
    ports:
      - "\${POSTGRES_PORT:-5432}:5432"
    env_file:
      - docker/postgres/.env
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - app_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped
`
    : "";

  const kafkaService = selection.kafka
    ? `
  kafka:
    build:
      context: docker/kafka
    hostname: kafka
    ports:
      - "9094:9094"
    env_file:
      - docker/kafka/.env
    networks:
      - app_network
    restart: unless-stopped
`
    : "";

  const redisService = selection.redis
    ? `
  redis:
    build:
      context: docker/redis
    hostname: redis
    ports:
      - "\${REDIS_PORT:-6379}:6379"
    env_file:
      - docker/redis/.env
    networks:
      - app_network
    healthcheck:
      test:
        [
          "CMD-SHELL",
          "redis-cli --user $$REDIS_USERNAME -a $$REDIS_PASSWORD ping | grep -q PONG",
        ]
      interval: 5s
      timeout: 3s
      retries: 5
    restart: unless-stopped
`
    : "";

  const otelService = selection.otel
    ? `
  otel:
    build:
      context: docker/otel
    ports:
      - "4318:4318"
    env_file:
      - docker/otel/.env
    networks:
      - app_network
    restart: unless-stopped
`
    : "";

  const spotlightService = selection.sentry
    ? `
  spotlight:
    build:
      context: docker/spotlight
    ports:
      - "8969:8969"
    env_file:
      - docker/spotlight/.env
    networks:
      - app_network
    restart: unless-stopped
`
    : "";

  return `services:
  app:
    build:
      context: .
      dockerfile: docker/app/Dockerfile
      target: build
      args:
        PORT: \${PORT:-3131}
    command: ./server
    volumes:
      - ./src:/app/src
    networks:
      app_network:
        aliases:
          - app
    extra_hosts:
      - "host.docker.internal:host-gateway"
    ports:
      - "\${PORT:-3131}:\${PORT:-3131}"
    restart: unless-stopped
    env_file:
      - path: .env
        required: false
      - docker/app/.env
${appDependsOn}    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:\${PORT:-3131}/healthz"]
      interval: 600s
      timeout: 300s
      retries: 1
      start_period: 90s
${postgresService}${kafkaService}${redisService}${otelService}${spotlightService}
networks:
  app_network:
    driver: bridge
${selection.postgres ? "\nvolumes:\n  postgres_data:\n" : ""}`;
}

async function patchDockerCompose(
  projectDir: string,
  selection: FeatureSelection,
  packageName: string,
) {
  if (!selection.postgres) {
    await removePaths(projectDir, [
      "docker/postgres",
      "docker/app/docker-entrypoint.sh",
    ]);
  }
  if (!selection.kafka) {
    await removePaths(projectDir, ["docker/kafka"]);
  }
  if (!selection.redis) {
    await removePaths(projectDir, ["docker/redis"]);
  }
  if (!selection.otel) {
    await removePaths(projectDir, ["docker/otel"]);
  }
  if (!selection.sentry) {
    await removePaths(projectDir, ["docker/spotlight"]);
  }

  await writeText(
    projectDir,
    "docker/app/.env",
    buildDockerAppEnv(selection, packageName),
  );
  if (selection.postgres) {
    await writeText(
      projectDir,
      "docker/postgres/.env",
      buildDockerPostgresEnv(packageName),
    );
  }
  if (selection.kafka) {
    await writeText(projectDir, "docker/kafka/.env", DOCKER_KAFKA_ENV);
  }
  if (selection.redis) {
    await writeText(
      projectDir,
      "docker/redis/.env",
      buildDockerRedisEnv(packageName),
    );
  }
  if (selection.otel) {
    await writeText(projectDir, "docker/otel/.env", DOCKER_OTEL_ENV);
  }
  if (selection.sentry) {
    await writeText(projectDir, "docker/spotlight/.env", DOCKER_SPOTLIGHT_ENV);
  }
  await writeText(
    projectDir,
    "docker-compose.yaml",
    generateDockerCompose(selection),
  );
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
  await patchDockerCompose(projectDir, selection, packageName);

  if (disabled.length > 0) {
    log.success("Feature selection applied");
  }
}

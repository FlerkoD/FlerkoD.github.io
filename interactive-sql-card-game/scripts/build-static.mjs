#!/usr/bin/env node
/**
 * Статическая сборка для GitHub Pages (без сервера и без базы данных).
 *
 *   node scripts/build-static.mjs
 *   BASE_PATH=/my-repo node scripts/build-static.mjs
 *
 * Что делает скрипт:
 *   1. временно убирает папку src/app/api (серверные маршруты несовместимы
 *      со статическим экспортом);
 *   2. запускает `next build` с output: "export";
 *   3. возвращает папку api на место;
 *   4. кладёт в out/ файл .nojekyll, иначе GitHub Pages выбросит папку _next.
 *
 * Результат — папка out/ с готовым сайтом.
 */
import { spawnSync } from "node:child_process";
import { existsSync, renameSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const apiDir = join(root, "src", "app", "api");
const parked = join(root, ".api.bak");
const outDir = join(root, "out");

const basePath = (process.env.BASE_PATH ?? "").replace(/\/$/, "");
if (basePath && !basePath.startsWith("/")) {
  console.error(`\n  BASE_PATH должен начинаться со слэша, например: BASE_PATH=/my-repo\n  Получено: ${basePath}\n`);
  process.exit(1);
}

let moved = false;
try {
  if (existsSync(apiDir)) {
    if (existsSync(parked)) {
      console.error("\n  Папка .api.bak уже существует — предыдущая сборка прервалась.\n  Верните её вручную в src/app/api и повторите.\n");
      process.exit(1);
    }
    renameSync(apiDir, parked);
    moved = true;
  }

  console.log(`\n▸ Статическая сборка${basePath ? ` с префиксом ${basePath}` : ""}…\n`);
  const res = spawnSync("npx", ["next", "build"], {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      STATIC_EXPORT: "1",
      BASE_PATH: basePath,
      // онлайн-режим требует сервер — в статической сборке его прячем
      NEXT_PUBLIC_ONLINE: "0",
    },
  });
  if (res.status !== 0) process.exit(res.status ?? 1);
} finally {
  if (moved) renameSync(parked, apiDir);
}

await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, ".nojekyll"), "");

console.log(`
✓ Готово. Сайт лежит в папке out/

  Локальная проверка:   npx serve out
  ${basePath ? `Открыть:              http://localhost:3000${basePath}/\n` : "Открыть:              http://localhost:3000/\n"}`);

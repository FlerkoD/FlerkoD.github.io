import type { NextConfig } from "next";

/**
 * Два режима сборки:
 *
 * 1. Обычный (по умолчанию) — `npm run build` + `npm start`.
 *    Работает всё, включая онлайн-режим через /api/room и PostgreSQL.
 *
 * 2. Статический — `node scripts/build-static.mjs`.
 *    Собирает папку `out/` из обычных HTML/JS/CSS файлов: ни сервера,
 *    ни базы данных не нужно. Подходит для GitHub Pages.
 *    Онлайн-режим в такой сборке отключается, остальные режимы работают.
 */
const isStatic = process.env.STATIC_EXPORT === "1";

// Для GitHub Pages по адресу https://<user>.github.io/<repo> нужен префикс "/<repo>".
// Для собственного домена или репозитория <user>.github.io оставьте пустым.
const basePath = (process.env.BASE_PATH ?? "").replace(/\/$/, "");

const nextConfig: NextConfig = isStatic
  ? {
      output: "export",
      trailingSlash: true,
      images: { unoptimized: true },
      ...(basePath ? { basePath, assetPrefix: basePath } : {}),
    }
  : {};

export default nextConfig;

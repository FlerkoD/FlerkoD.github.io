import Console from "@/components/Console";

/**
 * Игра целиком живёт в браузере: задания зашиты в код, рекорды — в localStorage.
 * База данных нужна только маршруту /api/room (онлайн-режим), поэтому здесь
 * нет обращений к ней — страница собирается и как статический HTML.
 */
export default function HomePage() {
  return <Console />;
}

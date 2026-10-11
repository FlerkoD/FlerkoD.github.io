import type { QueryTask } from "./types";

type Pair = [en: string, ru: string];
let seq = 0;
/** blocks and decoys are authored as " | "-separated strings */
const t = (db: string, tier: 1 | 2 | 3, brief: Pair, blocks: string, decoys: string, why: Pair, alts?: string[]): QueryTask => ({
  id: `${db}-q${String(++seq).padStart(2, "0")}`,
  db,
  tier,
  brief: { en: brief[0], ru: brief[1] },
  blocks: blocks.split(" | "),
  decoys: decoys.split(" | "),
  why: { en: why[0], ru: why[1] },
  alts,
});

const W_ANTI: Pair = [
  "LEFT JOIN keeps unmatched left rows with NULLs on the right; IS NULL keeps exactly those orphans. = NULL never matches.",
  "LEFT JOIN сохраняет строки слева без пары, подставляя NULL справа; IS NULL оставляет именно их. = NULL никогда не срабатывает.",
];
const W_HAVING: Pair = [
  "Aggregates are computed during grouping, so the threshold goes in HAVING — WHERE runs before any group exists.",
  "Агрегаты вычисляются при группировке, поэтому порог ставят в HAVING — WHERE выполняется, когда групп ещё нет.",
];
const W_GROUP: Pair = [
  "Every non-aggregated column in SELECT must appear in GROUP BY; the aggregate is computed once per group.",
  "Каждый неагрегированный столбец из SELECT должен быть в GROUP BY; агрегат считается один раз на группу.",
];
const W_WHERE: Pair = [
  "WHERE filters individual rows. SQL compares with a single =, and text literals take single quotes.",
  "WHERE фильтрует отдельные строки. В SQL сравнивают одним знаком =, а строки берут в одинарные кавычки.",
];
const W_ORDER: Pair = [
  "ORDER BY sorts ascending by default; add DESC to reverse. GROUP BY would collapse rows instead.",
  "ORDER BY по умолчанию сортирует по возрастанию; DESC меняет порядок. GROUP BY свернул бы строки.",
];
const W_JOIN: Pair = [
  "JOIN … ON pairs rows whose keys match — foreign key on one side, primary key on the other.",
  "JOIN … ON соединяет строки с совпадающими ключами — внешний ключ с одной стороны, первичный с другой.",
];

export const QUERY_TASKS: QueryTask[] = [
  // ── NORTHWIND ──
  t("northwind", 1, ["List every product name and price.", "Выведите название и цену каждого товара."], "SELECT | product_name, unit_price | FROM | products", "WHERE | product_name unit_price | TABLE", ["A minimal query is just SELECT columns FROM table. Columns are separated by commas.", "Минимальный запрос — это SELECT столбцы FROM таблица. Столбцы разделяются запятыми."]),
  t("northwind", 1, ["Company names of customers from Germany.", "Названия компаний-клиентов из Германии."], "SELECT | company_name | FROM | customers | WHERE | country = 'Germany'", "HAVING | country == 'Germany' | ORDER BY", W_WHERE),
  t("northwind", 2, ["Number of products in each category.", "Количество товаров в каждой категории."], "SELECT | category, COUNT(*) | FROM | products | GROUP BY | category", "ORDER BY | SUM(*) | WHERE", W_GROUP),
  t("northwind", 2, ["The five most expensive product names.", "Названия пяти самых дорогих товаров."], "SELECT | product_name | FROM | products | ORDER BY | unit_price DESC | LIMIT 5", "unit_price ASC | TOP 5 | GROUP BY", ["Sort descending first, then LIMIT keeps the top rows. TOP is SQL Server, not PostgreSQL.", "Сначала сортировка по убыванию, затем LIMIT оставляет верхние строки. TOP — это SQL Server, не PostgreSQL."]),
  t("northwind", 3, ["Company names of customers who never ordered.", "Названия компаний, которые ни разу не заказывали."], "SELECT | c.company_name | FROM customers c | LEFT JOIN orders o | ON c.customer_id = o.customer_id | WHERE | o.order_id IS NULL", "JOIN orders o | o.order_id = NULL | HAVING", W_ANTI, ["SELECT c.company_name FROM customers c LEFT JOIN orders o ON c.customer_id = o.customer_id WHERE o.customer_id IS NULL"]),
  t("northwind", 3, ["Countries with more than 20 customers, with the count.", "Страны, где больше 20 клиентов, с их количеством."], "SELECT | country, COUNT(*) | FROM | customers | GROUP BY | country | HAVING | COUNT(*) > 20", "WHERE | SUM(*) > 20 | ORDER BY", W_HAVING),

  // ── STREAMBOX ──
  t("streambox", 1, ["Titles of films released after 2010.", "Названия фильмов, вышедших после 2010 года."], "SELECT | title | FROM | movies | WHERE | release_year > 2010", "HAVING | release_year => 2010 | GROUP BY", W_WHERE),
  t("streambox", 1, ["Every username, alphabetically.", "Все имена пользователей по алфавиту."], "SELECT | username | FROM | users | ORDER BY | username", "GROUP BY | SORT BY | WHERE", W_ORDER),
  t("streambox", 2, ["Average rating of each film (by movie_id).", "Средняя оценка каждого фильма (по movie_id)."], "SELECT | movie_id, AVG(rating) | FROM | watch_history | GROUP BY | movie_id", "movie_id, MEAN(rating) | ORDER BY | HAVING", W_GROUP),
  t("streambox", 2, ["Titles watched by user 7.", "Названия фильмов, которые смотрел пользователь 7."], "SELECT | m.title | FROM movies m | JOIN watch_history w | ON m.movie_id = w.movie_id | WHERE | w.user_id = 7", "ON m.movie_id = w.user_id | HAVING | LEFT JOIN users u", W_JOIN),
  t("streambox", 3, ["Genres whose average rating is above 4.", "Жанры со средней оценкой выше 4."], "SELECT | m.genre, AVG(w.rating) | FROM movies m | JOIN watch_history w | ON m.movie_id = w.movie_id | GROUP BY | m.genre | HAVING | AVG(w.rating) > 4", "WHERE | AVG(w.rating) >= 4 | ORDER BY", W_HAVING),
  t("streambox", 3, ["Titles of films longer than the average runtime.", "Названия фильмов длиннее средней длительности."], "SELECT | title | FROM | movies | WHERE | runtime_min > (SELECT AVG(runtime_min) FROM movies)", "HAVING | runtime_min > AVG(runtime_min) | GROUP BY", ["Aggregates are not allowed directly in WHERE — wrap AVG in a scalar subquery.", "Агрегаты нельзя использовать прямо в WHERE — оберните AVG в скалярный подзапрос."]),

  // ── PITCHSIDE ──
  t("pitchside", 1, ["Names of all goalkeepers (position 'GK').", "Имена всех вратарей (position = 'GK')."], "SELECT | name | FROM | players | WHERE | position = 'GK'", "HAVING | position LIKE GK | ORDER BY", W_WHERE),
  t("pitchside", 1, ["Team names with founding year, oldest club first.", "Команды с годом основания, сначала старейшие."], "SELECT | name, founded_year | FROM | teams | ORDER BY | founded_year", "founded_year DESC | GROUP BY | WHERE", W_ORDER),
  t("pitchside", 2, ["Goals scored by each player (by player_id).", "Голы каждого игрока (по player_id)."], "SELECT | player_id, COUNT(*) | FROM | goals | GROUP BY | player_id", "player_id, SUM(*) | ORDER BY | WHERE", W_GROUP),
  t("pitchside", 2, ["Ids of matches that ended in a draw.", "Id матчей, закончившихся вничью."], "SELECT | match_id | FROM | matches | WHERE | home_score = away_score", "home_score == away_score | HAVING | GROUP BY", ["Two columns can be compared directly inside WHERE.", "Два столбца можно сравнивать напрямую внутри WHERE."]),
  t("pitchside", 3, ["Players (by id) with more than 10 goals, and their count.", "Игроки (по id) с более чем 10 голами и их число."], "SELECT | player_id, COUNT(*) | FROM | goals | GROUP BY | player_id | HAVING | COUNT(*) > 10", "WHERE | COUNT(*) >= 10 | ORDER BY", W_HAVING),
  t("pitchside", 3, ["Teams that never hosted a match.", "Команды, которые ни разу не играли дома."], "SELECT | t.name | FROM teams t | LEFT JOIN matches m | ON t.team_id = m.home_id | WHERE | m.match_id IS NULL", "JOIN matches m | m.match_id = NULL | ON t.team_id = m.away_id", W_ANTI),

  // ── MEDICORE ──
  t("medicore", 1, ["Names of patients from Kazan.", "Имена пациентов из Казани."], "SELECT | full_name | FROM | patients | WHERE | city = 'Kazan'", "HAVING | city = Kazan | GROUP BY", W_WHERE),
  t("medicore", 1, ["Every ward, listed once.", "Все отделения, каждое по разу."], "SELECT DISTINCT | ward | FROM | admissions", "SELECT UNIQUE | GROUP BY | WHERE", ["DISTINCT sits right after SELECT and removes duplicate rows.", "DISTINCT ставится сразу после SELECT и убирает повторы."]),
  t("medicore", 2, ["Number of admissions per ward.", "Число госпитализаций по отделениям."], "SELECT | ward, COUNT(*) | FROM | admissions | GROUP BY | ward", "ward, SUM(*) | ORDER BY | HAVING", W_GROUP),
  t("medicore", 2, ["Doctors hired since 2021, newest first.", "Врачи, нанятые с 2021 года, сначала новые."], "SELECT | full_name | FROM | doctors | WHERE | hire_date >= '2021-01-01' | ORDER BY | hire_date DESC", "hire_date ASC | HAVING | GROUP BY", ["WHERE filters, then ORDER BY … DESC puts the latest dates on top. Clause order is fixed.", "WHERE фильтрует, затем ORDER BY … DESC ставит новые даты наверх. Порядок операторов фиксирован."]),
  t("medicore", 3, ["Names of patients not yet discharged.", "Имена пациентов, ещё не выписанных."], "SELECT | p.full_name | FROM patients p | JOIN admissions a | ON p.patient_id = a.patient_id | WHERE | a.discharged_at IS NULL", "a.discharged_at = NULL | LEFT JOIN doctors d | HAVING", ["A missing date is NULL — test it with IS NULL, never with = NULL.", "Отсутствующая дата — это NULL; проверяйте IS NULL, а не = NULL."]),
  t("medicore", 3, ["Patient ids on more than three different drugs.", "Id пациентов, получающих больше трёх разных препаратов."], "SELECT | patient_id | FROM | medications | GROUP BY | patient_id | HAVING | COUNT(DISTINCT drug_name) > 3", "WHERE | COUNT(*) > 3 | ORDER BY", ["COUNT(*) would count prescriptions; COUNT(DISTINCT …) counts different drugs. The test belongs in HAVING.", "COUNT(*) посчитал бы назначения; COUNT(DISTINCT …) считает разные препараты. Условие — в HAVING."]),

  // ── ORBITAL ──
  t("orbital", 1, ["Ids of shipments with status 'lost'.", "Id грузов со статусом 'lost'."], "SELECT | shipment_id | FROM | shipments | WHERE | status = 'lost'", "HAVING | status == 'lost' | ORDER BY", W_WHERE),
  t("orbital", 1, ["Port names and gravity, heaviest first.", "Названия портов и гравитация, сначала самые тяжёлые."], "SELECT | name, gravity_g | FROM | ports | ORDER BY | gravity_g DESC", "gravity_g ASC | GROUP BY | WHERE", W_ORDER),
  t("orbital", 2, ["Total mass hauled by each vessel.", "Суммарная масса, перевезённая каждым кораблём."], "SELECT | vessel_id, SUM(mass_t) | FROM | shipments | GROUP BY | vessel_id", "vessel_id, COUNT(mass_t) | ORDER BY | HAVING", W_GROUP),
  t("orbital", 2, ["Routes between 100 and 500 million km long.", "Маршруты длиной от 100 до 500 млн км."], "SELECT | route_id | FROM | routes | WHERE | distance_mkm BETWEEN 100 AND 500", "distance_mkm IN (100, 500) | HAVING | ORDER BY", ["BETWEEN covers the whole inclusive range; IN would only match the two exact values.", "BETWEEN покрывает весь диапазон; IN совпал бы только с двумя точными значениями."]),
  t("orbital", 3, ["Names of vessels that never hauled a shipment.", "Названия кораблей без единого рейса."], "SELECT | v.name | FROM vessels v | LEFT JOIN shipments s | ON v.vessel_id = s.vessel_id | WHERE | s.shipment_id IS NULL", "JOIN shipments s | s.shipment_id = NULL | HAVING", W_ANTI),
  t("orbital", 3, ["Routes whose total shipped mass exceeds 1000 t.", "Маршруты, где суммарная масса грузов больше 1000 т."], "SELECT | route_id, SUM(mass_t) | FROM | shipments | GROUP BY | route_id | HAVING | SUM(mass_t) > 1000", "WHERE | SUM(mass_t) > 1000 AND | ORDER BY", W_HAVING),

  // ── LIBRIS ──
  t("libris", 1, ["Titles of books published before 1900.", "Названия книг, изданных до 1900 года."], "SELECT | title | FROM | books | WHERE | published_year < 1900", "HAVING | published_year =< 1900 | ORDER BY", W_WHERE),
  t("libris", 1, ["Every member's name, alphabetically.", "Имена всех читателей по алфавиту."], "SELECT | full_name | FROM | members | ORDER BY | full_name", "GROUP BY | SORT BY | WHERE", W_ORDER),
  t("libris", 2, ["Number of books in each genre.", "Количество книг в каждом жанре."], "SELECT | genre, COUNT(*) | FROM | books | GROUP BY | genre", "genre, SUM(*) | ORDER BY | WHERE", W_GROUP),
  t("libris", 2, ["Book titles with the author's name.", "Названия книг с именем автора."], "SELECT | b.title, a.full_name | FROM books b | JOIN authors a | ON b.author_id = a.author_id", "ON b.book_id = a.author_id | WHERE | LEFT JOIN loans l", W_JOIN),
  t("libris", 3, ["Titles of books that were never loaned.", "Названия книг, которые ни разу не выдавали."], "SELECT | b.title | FROM books b | LEFT JOIN loans l | ON b.book_id = l.book_id | WHERE | l.loan_id IS NULL", "JOIN loans l | l.loan_id = NULL | HAVING", W_ANTI),
  t("libris", 3, ["Members whose total fines exceed 100, with the total.", "Читатели, чьи штрафы в сумме больше 100, с суммой."], "SELECT | member_id, SUM(fine) | FROM | loans | GROUP BY | member_id | HAVING | SUM(fine) > 100", "WHERE | COUNT(fine) > 100 | ORDER BY", W_HAVING),

  // ── CAMPUS ──
  t("campus", 1, ["Names of students with GPA above 3.5.", "Имена студентов со средним баллом выше 3.5."], "SELECT | full_name | FROM | students | WHERE | gpa > 3.5", "HAVING | gpa => 3.5 | GROUP BY", W_WHERE),
  t("campus", 1, ["Top 10 students by GPA (name and GPA).", "10 лучших студентов по баллу (имя и балл)."], "SELECT | full_name, gpa | FROM | students | ORDER BY | gpa DESC | LIMIT 10", "TOP 10 | gpa ASC | GROUP BY", ["ORDER BY … DESC then LIMIT — the classic top-N pattern in PostgreSQL.", "ORDER BY … DESC и затем LIMIT — классический шаблон «топ-N» в PostgreSQL."]),
  t("campus", 2, ["Average GPA per faculty.", "Средний балл по факультетам."], "SELECT | faculty, AVG(gpa) | FROM | students | GROUP BY | faculty", "faculty, SUM(gpa) | ORDER BY | HAVING", W_GROUP),
  t("campus", 2, ["Names of students enrolled in course 101.", "Имена студентов, записанных на курс 101."], "SELECT | s.full_name | FROM students s | JOIN enrollments e | ON s.student_id = e.student_id | WHERE | e.course_id = 101", "ON s.student_id = e.course_id | HAVING | LEFT JOIN courses c", W_JOIN),
  t("campus", 3, ["Titles of courses nobody is enrolled in.", "Названия курсов, на которые никто не записан."], "SELECT | c.title | FROM courses c | LEFT JOIN enrollments e | ON c.course_id = e.course_id | WHERE | e.student_id IS NULL", "JOIN enrollments e | e.student_id = NULL | HAVING", W_ANTI),
  t("campus", 3, ["Names of students above the overall average GPA.", "Имена студентов с баллом выше общего среднего."], "SELECT | full_name | FROM | students | WHERE | gpa > (SELECT AVG(gpa) FROM students)", "HAVING | gpa > AVG(gpa) | GROUP BY", ["Compare each row against a scalar subquery; bare AVG is illegal in WHERE.", "Сравнивайте каждую строку со скалярным подзапросом; голый AVG в WHERE недопустим."]),

  // ── LEDGER ──
  t("ledger", 1, ["Ids of accounts with a negative balance.", "Id счетов с отрицательным балансом."], "SELECT | account_id | FROM | accounts | WHERE | balance < 0", "HAVING | balance < '0' | ORDER BY", W_WHERE),
  t("ledger", 1, ["Every transaction kind, listed once.", "Все виды транзакций, каждый по разу."], "SELECT DISTINCT | kind | FROM | transactions", "SELECT UNIQUE | GROUP BY | WHERE", ["DISTINCT right after SELECT removes duplicate rows.", "DISTINCT сразу после SELECT убирает повторяющиеся строки."]),
  t("ledger", 2, ["Total transaction amount per account.", "Сумма транзакций по каждому счёту."], "SELECT | account_id, SUM(amount) | FROM | transactions | GROUP BY | account_id", "account_id, COUNT(amount) | ORDER BY | HAVING", W_GROUP),
  t("ledger", 2, ["Number of accounts of each type, most common first.", "Количество счетов каждого типа, сначала самые частые."], "SELECT | type, COUNT(*) | FROM | accounts | GROUP BY | type | ORDER BY | COUNT(*) DESC", "COUNT(*) ASC | WHERE | HAVING", ["GROUP BY first, then ORDER BY may sort on the aggregate itself.", "Сначала GROUP BY, затем ORDER BY может сортировать по самому агрегату."]),
  t("ledger", 3, ["Names of clients without any account.", "Имена клиентов без единого счёта."], "SELECT | c.full_name | FROM clients c | LEFT JOIN accounts a | ON c.client_id = a.client_id | WHERE | a.account_id IS NULL", "JOIN accounts a | a.account_id = NULL | HAVING", W_ANTI),
  t("ledger", 3, ["Accounts with more than 100 transactions, with the count.", "Счета, у которых больше 100 транзакций, с их числом."], "SELECT | account_id, COUNT(*) | FROM | transactions | GROUP BY | account_id | HAVING | COUNT(*) > 100", "WHERE | SUM(*) > 100 | ORDER BY", W_HAVING),
];

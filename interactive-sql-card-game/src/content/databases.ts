import type { ColumnDef, TableDef, TrainingDb } from "./types";

/** compact column spec:  "customer_id:uuid:pk"  */
const T = (name: string, rows: number, cols: string): TableDef => ({
  name,
  rows,
  columns: cols.split(/\s+/).map((c): ColumnDef => {
    const [n, type, key] = c.split(":");
    return { name: n, type, ...(key ? { key: key as "pk" | "fk" } : {}) };
  }),
});

export const DATABASES: TrainingDb[] = [
  {
    id: "northwind",
    name: "NORTHWIND TRADERS",
    vendor: "postgresql 16 · 5 tables",
    tagline: { en: "Retail & wholesale orders", ru: "Оптовая и розничная торговля" },
    brief: {
      en: "A specialty foods wholesaler. Customers, the orders they place and the lines inside them.",
      ru: "Оптовый поставщик деликатесов. Клиенты, их заказы и позиции внутри заказов.",
    },
    glyph: "cart",
    tables: [
      T("customers", 91, "customer_id:uuid:pk company_name:text country:text city:text segment:text"),
      T("orders", 830, "order_id:int:pk customer_id:uuid:fk employee_id:int:fk order_date:date freight:numeric"),
      T("order_items", 2844, "order_id:int:fk product_id:int:fk unit_price:numeric quantity:smallint"),
      T("products", 77, "product_id:int:pk product_name:text category:text unit_price:numeric units_in_stock:smallint"),
      T("employees", 12, "employee_id:int:pk full_name:text title:text region:text hired_at:date"),
    ],
  },
  {
    id: "streambox",
    name: "STREAMBOX",
    vendor: "postgresql 16 · 4 tables",
    tagline: { en: "Film streaming service", ru: "Стриминговый кинотеатр" },
    brief: {
      en: "A catalogue of films, the people watching them and the ratings they leave behind.",
      ru: "Каталог фильмов, зрители и оценки, которые они оставляют.",
    },
    glyph: "film",
    tables: [
      T("users", 1450, "user_id:int:pk username:text country:text signup_date:date plan:text"),
      T("movies", 620, "movie_id:int:pk title:text genre:text release_year:smallint runtime_min:smallint"),
      T("watch_history", 21400, "watch_id:bigint:pk user_id:int:fk movie_id:int:fk watched_at:timestamptz minutes_watched:smallint rating:numeric"),
      T("genres", 18, "genre_id:smallint:pk name:text"),
    ],
  },
  {
    id: "pitchside",
    name: "PITCHSIDE",
    vendor: "postgresql 16 · 4 tables",
    tagline: { en: "Football match archive", ru: "Архив футбольных матчей" },
    brief: {
      en: "Three seasons of results: clubs, squads, every fixture and every goal minute.",
      ru: "Три сезона: клубы, составы, каждый матч и минута каждого гола.",
    },
    glyph: "ball",
    tables: [
      T("teams", 42, "team_id:smallint:pk name:text league:text founded_year:smallint"),
      T("players", 640, "player_id:int:pk name:text team_id:smallint:fk position:text goals:smallint"),
      T("matches", 1512, "match_id:int:pk home_id:smallint:fk away_id:smallint:fk match_date:date home_score:smallint away_score:smallint"),
      T("goals", 4130, "goal_id:int:pk match_id:int:fk player_id:int:fk minute:smallint"),
    ],
  },
  {
    id: "medicore",
    name: "MEDICORE EHR",
    vendor: "postgresql 16 · 4 tables",
    tagline: { en: "Hospital records", ru: "Больничные записи" },
    brief: {
      en: "Ward admissions, the clinicians running them and the drugs prescribed on each stay.",
      ru: "Госпитализации, лечащие врачи и назначенные препараты.",
    },
    glyph: "cross",
    tables: [
      T("patients", 3200, "patient_id:int:pk full_name:text dob:date blood_type:text city:text"),
      T("admissions", 5140, "admission_id:int:pk patient_id:int:fk doctor_id:int:fk admitted_at:date discharged_at:date ward:text"),
      T("doctors", 96, "doctor_id:int:pk full_name:text specialty:text hire_date:date"),
      T("medications", 18700, "med_id:bigint:pk patient_id:int:fk drug_name:text dose_mg:smallint prescribed_at:date"),
    ],
  },
  {
    id: "orbital",
    name: "ORBITAL LOGISTICS",
    vendor: "postgresql 16 · 4 tables",
    tagline: { en: "Interplanetary freight", ru: "Межпланетные грузоперевозки" },
    brief: {
      en: "Bulk haulage between ports: hulls, deep-space routes and every shipment manifest.",
      ru: "Перевозки между портами: корабли, маршруты дальнего космоса и каждая накладная.",
    },
    glyph: "rocket",
    tables: [
      T("vessels", 28, "vessel_id:smallint:pk name:text class:text capacity_t:numeric commissioned:date"),
      T("ports", 34, "port_id:smallint:pk name:text sector:text gravity_g:numeric"),
      T("routes", 118, "route_id:smallint:pk origin_id:smallint:fk dest_id:smallint:fk distance_mkm:numeric"),
      T("shipments", 9040, "shipment_id:bigint:pk route_id:smallint:fk vessel_id:smallint:fk mass_t:numeric launched_at:date status:text"),
    ],
  },
  {
    id: "libris",
    name: "LIBRIS",
    vendor: "postgresql 16 · 4 tables",
    tagline: { en: "Public library network", ru: "Сеть городских библиотек" },
    brief: {
      en: "Books, the authors who wrote them, library members and every loan with its late fine.",
      ru: "Книги, их авторы, читатели и каждая выдача вместе со штрафом за просрочку.",
    },
    glyph: "book",
    tables: [
      T("books", 12800, "book_id:int:pk title:text author_id:int:fk genre:text published_year:smallint copies:smallint"),
      T("authors", 2100, "author_id:int:pk full_name:text country:text born_year:smallint"),
      T("members", 5400, "member_id:int:pk full_name:text city:text joined_at:date"),
      T("loans", 64000, "loan_id:bigint:pk book_id:int:fk member_id:int:fk loaned_at:date returned_at:date fine:numeric"),
    ],
  },
  {
    id: "campus",
    name: "CAMPUS REGISTRY",
    vendor: "postgresql 16 · 4 tables",
    tagline: { en: "University records", ru: "Университетский реестр" },
    brief: {
      en: "Students, courses, the professors teaching them and every grade ever recorded.",
      ru: "Студенты, курсы, преподаватели и каждая выставленная оценка.",
    },
    glyph: "cap",
    tables: [
      T("students", 9300, "student_id:int:pk full_name:text faculty:text enrolled_year:smallint gpa:numeric"),
      T("courses", 410, "course_id:int:pk title:text faculty:text credits:smallint"),
      T("enrollments", 51000, "student_id:int:fk course_id:int:fk term:text grade:numeric"),
      T("professors", 380, "professor_id:int:pk full_name:text faculty:text salary:numeric"),
    ],
  },
  {
    id: "ledger",
    name: "LEDGER BANK",
    vendor: "postgresql 16 · 4 tables",
    tagline: { en: "Retail bank", ru: "Розничный банк" },
    brief: {
      en: "Clients, their accounts, every transaction and the branches that serve them.",
      ru: "Клиенты, их счета, каждая транзакция и обслуживающие отделения.",
    },
    glyph: "bank",
    tables: [
      T("clients", 24000, "client_id:int:pk full_name:text city:text risk_level:text"),
      T("accounts", 38000, "account_id:int:pk client_id:int:fk type:text balance:numeric opened_at:date"),
      T("transactions", 920000, "tx_id:bigint:pk account_id:int:fk amount:numeric kind:text created_at:timestamptz"),
      T("branches", 64, "branch_id:smallint:pk city:text manager:text"),
    ],
  },
];

export const DB_BY_ID: Record<string, TrainingDb> = Object.fromEntries(DATABASES.map((d) => [d.id, d]));

import "server-only";

import { promises as fs } from "fs";
import path from "path";
import initSqlJs, { type Database } from "sql.js/dist/sql-asm.js";

type SqlParam = string | number | null;
type SqlRow = Record<string, unknown>;

const schema = `
CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  session_token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  FOREIGN KEY (user_id) REFERENCES admin_users(id)
);

CREATE TABLE IF NOT EXISTS ranking_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  status TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  generated_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT,
  created_by_email TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS ranking_lists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version_id INTEGER NOT NULL,
  list_key TEXT NOT NULL,
  total INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (version_id) REFERENCES ranking_versions(id)
);

CREATE TABLE IF NOT EXISTS ranking_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  list_id INTEGER NOT NULL,
  position INTEGER NOT NULL,
  query TEXT NOT NULL,
  title TEXT NOT NULL,
  score REAL NOT NULL DEFAULT 0,
  display_time TEXT,
  source_url TEXT,
  hidden INTEGER NOT NULL DEFAULT 0,
  source_type TEXT NOT NULL DEFAULT 'manual',
  titles_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (list_id) REFERENCES ranking_lists(id)
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_token_hash ON admin_sessions(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_ranking_versions_status ON ranking_versions(status);
CREATE INDEX IF NOT EXISTS idx_ranking_lists_version_id ON ranking_lists(version_id);
CREATE INDEX IF NOT EXISTS idx_ranking_items_list_id ON ranking_items(list_id);
`;

let dbPromise: Promise<Database> | null = null;
let writeQueue: Promise<unknown> = Promise.resolve();

const getAdminDataDir = () =>
  process.env.ADMIN_DATA_DIR || path.join(process.cwd(), "data", "admin");

const getAdminDbFile = () => path.join(getAdminDataDir(), "admin.sqlite");

const persistDb = async (db: Database) => {
  const filePath = getAdminDbFile();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, Buffer.from(db.export()));
};

const initDatabase = async () => {
  const SQL = await initSqlJs();
  const filePath = getAdminDbFile();

  try {
    const file = await fs.readFile(filePath);
    const db = new SQL.Database(file);
    db.run(schema);
    return db;
  } catch {
    const db = new SQL.Database();
    db.run(schema);
    await persistDb(db);
    return db;
  }
};

const getDb = async () => {
  if (!dbPromise) {
    dbPromise = initDatabase();
  }
  return dbPromise;
};

const waitForWrites = async () => {
  try {
    await writeQueue;
  } catch {
    // Ignore previous failed write to allow subsequent operations.
  }
};

export const allRows = async (sql: string, params: SqlParam[] = []) => {
  await waitForWrites();
  const db = await getDb();
  const statement = db.prepare(sql);
  statement.bind(params);

  const rows: SqlRow[] = [];
  while (statement.step()) {
    rows.push(statement.getAsObject());
  }
  statement.free();
  return rows;
};

export const firstRow = async (sql: string, params: SqlParam[] = []) => {
  const rows = await allRows(sql, params);
  return rows[0] || null;
};

export const scalar = async (sql: string, params: SqlParam[] = []) => {
  const row = await firstRow(sql, params);
  if (!row) return null;
  const firstKey = Object.keys(row)[0];
  return firstKey ? row[firstKey] : null;
};

export const mutate = async <T>(handler: (db: Database) => T | Promise<T>) => {
  writeQueue = writeQueue.catch(() => undefined).then(async () => {
    const db = await getDb();
    const result = await handler(db);
    await persistDb(db);
    return result;
  });

  return writeQueue as Promise<T>;
};

export const runStatement = (db: Database, sql: string, params: SqlParam[] = []) => {
  const statement = db.prepare(sql);
  statement.run(params);
  statement.free();
};

export const queryRows = (db: Database, sql: string, params: SqlParam[] = []) => {
  const statement = db.prepare(sql);
  statement.bind(params);

  const rows: SqlRow[] = [];
  while (statement.step()) {
    rows.push(statement.getAsObject());
  }
  statement.free();
  return rows;
};

export const queryFirstRow = (db: Database, sql: string, params: SqlParam[] = []) => {
  const rows = queryRows(db, sql, params);
  return rows[0] || null;
};

export const queryScalar = (db: Database, sql: string, params: SqlParam[] = []) => {
  const row = queryFirstRow(db, sql, params);
  if (!row) return null;
  const firstKey = Object.keys(row)[0];
  return firstKey ? row[firstKey] : null;
};

export const toNumber = (value: unknown) => {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string" && value.trim()) return Number(value);
  return 0;
};

export const toStringValue = (value: unknown) => (typeof value === "string" ? value : "");

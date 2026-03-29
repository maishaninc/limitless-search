import "server-only";

import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { allRows, firstRow, mutate, queryFirstRow, queryScalar, runStatement, scalar, toNumber, toStringValue } from "@/lib/admin-db";

export type AdminUser = {
  id: number;
  email: string;
  createdAt: string;
  lastLoginAt: string | null;
};

export const ADMIN_SESSION_COOKIE = "limitless-admin-session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

const nowIso = () => new Date().toISOString();

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const hashPassword = (password: string) => {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
};

const verifyPassword = (password: string, storedHash: string) => {
  const [salt, expected] = storedHash.split(":");
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, "hex");
  return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
};

const hashSessionToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

const mapAdminUser = (row: Record<string, unknown>): AdminUser => ({
  id: toNumber(row.id),
  email: toStringValue(row.email),
  createdAt: toStringValue(row.created_at),
  lastLoginAt: row.last_login_at ? toStringValue(row.last_login_at) : null,
});

export const getAdminUserCount = async () => {
  const value = await scalar("SELECT COUNT(*) AS count FROM admin_users");
  return toNumber(value);
};

export const findAdminUserByEmail = async (email: string) => {
  const normalized = normalizeEmail(email);
  const row = await firstRow("SELECT * FROM admin_users WHERE email = ?", [normalized]);
  return row ? { row, user: mapAdminUser(row) } : null;
};

export const createAdminUser = async (email: string, password: string) => {
  const normalized = normalizeEmail(email);
  const timestamp = nowIso();

  return mutate((db) => {
    const existing = queryScalar(db, "SELECT COUNT(*) AS count FROM admin_users");
    if (toNumber(existing) > 0) {
      throw new Error("Admin user already initialized");
    }

    runStatement(
      db,
      `
      INSERT INTO admin_users (email, password_hash, created_at, updated_at, last_login_at)
      VALUES (?, ?, ?, ?, NULL)
      `,
      [normalized, hashPassword(password), timestamp, timestamp],
    );

    const row = queryFirstRow(db, "SELECT * FROM admin_users WHERE email = ?", [normalized]);
    if (!row) {
      throw new Error("Failed to create admin user");
    }
    return mapAdminUser(row);
  });
};

export const createAdminSession = async (
  userId: number,
  options: { ip?: string | null; userAgent?: string | null },
) => {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(token);
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  await mutate((db) => {
    runStatement(
      db,
      `
      INSERT INTO admin_sessions (user_id, session_token_hash, expires_at, created_at, last_seen_at, ip, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [userId, tokenHash, expiresAt, createdAt, createdAt, options.ip || null, options.userAgent || null],
    );

    runStatement(
      db,
      "UPDATE admin_users SET last_login_at = ?, updated_at = ? WHERE id = ?",
      [createdAt, createdAt, userId],
    );
  });

  return { token, expiresAt };
};

export const authenticateAdmin = async (
  email: string,
  password: string,
  options: { ip?: string | null; userAgent?: string | null },
) => {
  const record = await findAdminUserByEmail(email);
  if (!record) {
    throw new Error("Invalid email or password");
  }

  const passwordHash = toStringValue(record.row.password_hash);
  if (!verifyPassword(password, passwordHash)) {
    throw new Error("Invalid email or password");
  }

  const session = await createAdminSession(record.user.id, options);
  return {
    user: record.user,
    session,
  };
};

export const deleteAdminSession = async (token: string) => {
  const tokenHash = hashSessionToken(token);
  await mutate((db) => {
    runStatement(db, "DELETE FROM admin_sessions WHERE session_token_hash = ?", [tokenHash]);
  });
};

export const getAdminUserFromSession = async (token: string) => {
  const tokenHash = hashSessionToken(token);
  const now = nowIso();

  const rows = await allRows(
    `
    SELECT u.*
    FROM admin_sessions s
    INNER JOIN admin_users u ON u.id = s.user_id
    WHERE s.session_token_hash = ? AND s.expires_at > ?
    LIMIT 1
    `,
    [tokenHash, now],
  );

  const row = rows[0];
  if (!row) return null;

  await mutate((db) => {
    runStatement(db, "UPDATE admin_sessions SET last_seen_at = ? WHERE session_token_hash = ?", [now, tokenHash]);
    runStatement(db, "DELETE FROM admin_sessions WHERE expires_at <= ?", [now]);
  });

  return mapAdminUser(row);
};

export const getCurrentAdminUser = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;
  return getAdminUserFromSession(token);
};

export const requireAdminUser = async () => {
  const user = await getCurrentAdminUser();
  if (!user) {
    redirect("/admin");
  }
  return user;
};

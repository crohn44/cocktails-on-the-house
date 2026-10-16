import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { db } from "./db.js";
import { HttpError, parseCookies } from "./http.js";

const scryptAsync = promisify(scrypt);
export const SESSION_COOKIE = "coth_session";
const SESSION_DAYS = 30;

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password, stored) {
  const [scheme, saltHex, keyHex] = String(stored).split("$");
  if (scheme !== "scrypt" || !saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, "hex");
  const actual = await scryptAsync(password, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(expected, actual);
}

export function createSession(userId) {
  const token = randomBytes(32).toString("base64url");
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(token, userId, expires);
  return { token, expires };
}

export function destroySession(token) {
  if (token) db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

export function sessionCookie(token, expires) {
  // Set COOKIE_SECURE=true when the site is served over HTTPS (i.e. once deployed).
  const secure = process.env.COOKIE_SECURE === "true" ? "; Secure" : "";
  if (!token) return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
  const maxAge = Math.floor((expires - Date.now()) / 1000);
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function getSessionToken(req) {
  return parseCookies(req.headers.cookie)[SESSION_COOKIE] || null;
}

/** Returns the signed-in user ({id, email, displayName}) or null. */
export function currentUser(req) {
  const token = getSessionToken(req);
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT u.id, u.email, u.display_name, s.expires_at
         FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token = ?`
    )
    .get(token);
  if (!row) return null;
  if (row.expires_at < Date.now()) {
    destroySession(token);
    return null;
  }
  return { id: row.id, email: row.email, displayName: row.display_name };
}

export function requireUser(req) {
  const user = currentUser(req);
  if (!user) throw new HttpError(401, "Please sign in first.");
  return user;
}

export function cleanupExpiredSessions() {
  db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(Date.now());
}

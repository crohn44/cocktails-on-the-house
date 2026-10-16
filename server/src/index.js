import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import "./db.js";
import { router } from "./routes.js";
import { HttpError, sendJson } from "./http.js";
import { cleanupExpiredSessions } from "./auth.js";

const PORT = Number(process.env.PORT) || 3001;
const here = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = resolve(here, "../../client/dist");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".woff2": "font/woff2",
};

/** Block cross-site requests that try to change data (basic CSRF protection). */
function checkOrigin(req) {
  if (req.method === "GET" || req.method === "HEAD") return;
  const origin = req.headers.origin;
  if (!origin) return;
  try {
    if (new URL(origin).host !== req.headers.host) throw new Error();
  } catch {
    throw new HttpError(403, "Cross-origin request blocked.");
  }
}

/** In production, serve the built React app from client/dist. */
function serveStatic(req, res, pathname) {
  if (!existsSync(CLIENT_DIST)) return false;
  let file = normalize(join(CLIENT_DIST, pathname));
  if (!file.startsWith(CLIENT_DIST)) return false;
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(CLIENT_DIST, "index.html"); // SPA fallback
  if (!existsSync(file)) return false;
  const isAsset = file.includes(`${join(CLIENT_DIST, "assets")}`);
  res.writeHead(200, {
    "Content-Type": MIME[extname(file)] || "application/octet-stream",
    "Cache-Control": isAsset ? "public, max-age=31536000, immutable" : "no-cache",
  });
  createReadStream(file).pipe(res);
  return true;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  try {
    if (url.pathname.startsWith("/api/")) {
      checkOrigin(req);
      const match = router.match(req.method, url.pathname);
      if (!match) throw new HttpError(404, "Not found");
      await match.handler(req, res, { params: match.params, query: url.searchParams });
      return;
    }
    if ((req.method === "GET" || req.method === "HEAD") && serveStatic(req, res, url.pathname)) return;
    sendJson(res, 404, {
      error: "Not found. In development, open the React app at http://localhost:5173",
    });
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    if (status === 500) console.error(err);
    if (!res.headersSent) sendJson(res, status, { error: status === 500 ? "Something went wrong." : err.message });
  }
});

server.listen(PORT, () => {
  console.log(`🍸 Cocktails on the House API listening on http://localhost:${PORT}`);
});

cleanupExpiredSessions();
setInterval(cleanupExpiredSessions, 60 * 60 * 1000).unref();

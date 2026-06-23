/**
 * Standalone production server for the Expo web/PWA export.
 * Static assets are served directly and application routes fall back to
 * index.html so Expo Router can resolve them client-side.
 *
 * Zero external dependencies — uses only Node.js built-ins (http, fs, path).
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const STATIC_ROOT = path.resolve(__dirname, "..", "static-build");
const basePath = (process.env.BASE_PATH || "/").replace(/\/+$/, "");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".map": "application/json",
  ".webmanifest": "application/manifest+json",
};

function serveStaticFile(urlPath, res, allowAppFallback = false) {
  const safePath = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, "");
  let filePath = path.join(STATIC_ROOT, safePath);

  if (!filePath.startsWith(STATIC_ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (
    (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) &&
    allowAppFallback
  ) {
    filePath = path.join(STATIC_ROOT, "index.html");
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end("Not Found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const content = fs.readFileSync(filePath);
  const cacheControl =
    ext === ".html" ||
    ext === ".webmanifest" ||
    path.basename(filePath) === "sw.js"
      ? "no-cache"
      : "public, max-age=31536000, immutable";
  res.writeHead(200, {
    "content-type": contentType,
    "cache-control": cacheControl,
  });
  res.end(content);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  let pathname = url.pathname;

  if (basePath && pathname.startsWith(basePath)) {
    pathname = pathname.slice(basePath.length) || "/";
  }

  const hasFileExtension = path.extname(pathname) !== "";
  serveStaticFile(pathname === "/" ? "/index.html" : pathname, res, !hasFileExtension);
});

const port = parseInt(process.env.PORT || "3000", 10);
server.listen(port, "0.0.0.0", () => {
  console.log(`Serving EquaPay PWA on port ${port}`);
});

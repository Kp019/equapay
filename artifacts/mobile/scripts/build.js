const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");
const outputDir = path.join(projectRoot, "static-build");

fs.rmSync(outputDir, { recursive: true, force: true });

const result = spawnSync(
  "pnpm",
  [
    "exec",
    "expo",
    "export",
    "--platform",
    "web",
    "--output-dir",
    "static-build",
    "--clear",
  ],
  {
    cwd: projectRoot,
    env: process.env,
    stdio: "inherit",
  },
);

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  process.exit(result.status || 1);
}

const indexPath = path.join(outputDir, "index.html");
let indexHtml = fs.readFileSync(indexPath, "utf8");
const pwaHead = `
    <meta name="application-name" content="EquaPay" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="EquaPay" />
    <meta name="description" content="Split group bills and track shared expenses with EquaPay." />
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
`;

if (!indexHtml.includes('rel="manifest"')) {
  indexHtml = indexHtml.replace("</head>", `${pwaHead}  </head>`);
  fs.writeFileSync(indexPath, indexHtml);
}

console.log("EquaPay PWA exported to static-build/");

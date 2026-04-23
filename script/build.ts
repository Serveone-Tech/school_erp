import { build } from "esbuild";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

async function main() {
  // ── 1. Frontend: Vite ───────────────────────────────────────────────────────
  console.log("Building frontend...");
  execSync("npx vite build", { stdio: "inherit", cwd: root });

  // ── 2. Backend: esbuild ─────────────────────────────────────────────────────
  console.log("Building backend...");
  await build({
    entryPoints: [path.join(root, "server/index.ts")],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile: path.join(root, "dist/index.cjs"),
    packages: "external",
    alias: {
      "@shared": path.join(root, "shared"),
    },
    // server/vite.ts is dev-only (inside an else branch guarded by isProduction).
    // Mark it external so esbuild doesn't follow its imports into vite.config.ts.
    external: ["./vite"],
    logOverride: {
      // vite.config.ts uses import.meta.dirname — harmless since it's dead code in prod
      "empty-import-meta": "silent",
    },
  });

  console.log("Build complete! Run: npm start");
}

main().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});

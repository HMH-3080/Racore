import { readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = resolve(__dirname, "../package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));

const current = pkg.version.split(".").map(Number);
const type = process.argv[2] || "patch";

if (type === "major") {
  current[0]++;
  current[1] = 0;
  current[2] = 0;
} else if (type === "minor") {
  current[1]++;
  current[2] = 0;
} else {
  current[2]++;
}

const next = current.join(".");
pkg.version = next;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
console.log(`Bumped to ${next}`);

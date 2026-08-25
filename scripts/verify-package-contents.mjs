import { readFileSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cacheDirectory = resolve(repositoryRoot, ".npm-cache");

try {
  const output = readFileSync(0, "utf8");
  const [pack] = JSON.parse(output);
  const paths = pack.files.map(({ path }) => path);
  const required = ["LICENSE", "README.md", "package.json", "dist/index.js", "dist/index.d.ts"];

  if (!required.every((path) => paths.includes(path))) {
    throw new Error(`package is missing a required file: ${paths.join(", ")}`);
  }
  if (!paths.some((path) => path.startsWith("dist/") && path.endsWith(".js"))) {
    throw new Error("package does not contain built JavaScript");
  }
  if (!paths.some((path) => path.startsWith("dist/") && path.endsWith(".d.ts"))) {
    throw new Error("package does not contain type declarations");
  }

  const forbidden = paths.filter((path) =>
    path.startsWith("src/") ||
    path.startsWith("tests/") ||
    path.startsWith(".github/") ||
    path.endsWith(".tgz")
  );
  if (forbidden.length > 0) {
    throw new Error(`package contains development files: ${forbidden.join(", ")}`);
  }
} finally {
  rmSync(cacheDirectory, { recursive: true, force: true });
}

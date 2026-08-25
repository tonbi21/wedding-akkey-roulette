import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const sourceExtensions = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const roots = ["src", "next.config.ts", "vitest.config.ts", "scripts"];
const failures = [];
const files = [];
const forbiddenRandomCall = ["Math", "random"].join(".") + "(";

function collect(entry) {
  const stats = statSync(entry);
  if (stats.isDirectory()) {
    for (const child of readdirSync(entry)) collect(path.join(entry, child));
    return;
  }

  if (sourceExtensions.has(path.extname(entry))) files.push(entry);
}

for (const root of roots) collect(root);

for (const file of files) {
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, index) => {
    if (/\s+$/.test(line)) failures.push(`${file}:${index + 1}: trailing whitespace`);
    if (line.includes(forbiddenRandomCall)) failures.push(`${file}:${index + 1}: Math.random is forbidden`);
    if (/https?:\/\//.test(line)) failures.push(`${file}:${index + 1}: external runtime URL is forbidden`);
  });
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`lint: checked ${files.length} source files`);
}

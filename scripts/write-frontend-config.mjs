import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const outputPath = join(
  "chinese-learning-v2",
  "chinese-learning",
  "frontend",
  "js",
  "deploy-config.js",
);

const apiBaseUrl = process.env.HANYU_API_BASE_URL || "";
const content = `window.HANYU_API_BASE_URL = ${JSON.stringify(apiBaseUrl)};\n`;

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, content, "utf8");
console.log(`Wrote ${outputPath}`);

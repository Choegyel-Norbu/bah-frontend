import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');
const ALLOWED_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.css']);
const DISALLOWED_TOKENS = ['font-serif', 'font-sans'];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(absolute)));
      continue;
    }
    if (!entry.isFile()) continue;
    if (ALLOWED_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(absolute);
    }
  }

  return files;
}

function findTokenHits(content, token) {
  const lines = content.split('\n');
  const hits = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].includes(token)) {
      hits.push({ line: i + 1, token, snippet: lines[i].trim() });
    }
  }
  return hits;
}

async function main() {
  const files = await walk(SRC_DIR);
  const violations = [];

  for (const file of files) {
    const content = await readFile(file, 'utf8');
    for (const token of DISALLOWED_TOKENS) {
      violations.push(
        ...findTokenHits(content, token).map((hit) => ({
          file,
          ...hit,
        }))
      );
    }
  }

  if (violations.length === 0) {
    console.log('Font convention check passed.');
    process.exit(0);
  }

  console.error('Font convention check failed.');
  console.error('Use `font-brand` instead of disallowed utility classes.');
  for (const violation of violations) {
    const relativePath = path.relative(ROOT, violation.file);
    console.error(`- ${relativePath}:${violation.line} contains "${violation.token}"`);
    console.error(`  ${violation.snippet}`);
  }
  process.exit(1);
}

main().catch((error) => {
  console.error('Failed to run font convention check.');
  console.error(error);
  process.exit(1);
});

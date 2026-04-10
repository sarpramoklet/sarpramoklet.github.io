import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const TRACKED_FILES = execSync('git ls-files', { encoding: 'utf8' })
  .split('\n')
  .map((file) => file.trim())
  .filter(Boolean);

const IGNORE_PATTERNS = [
  /^\.env(?:\.|$)/,
  /^dist\//,
  /^node_modules\//,
];

const GEMINI_KEY_PATTERN = /AIza[0-9A-Za-z_-]{20,}/g;
const findings = [];

for (const file of TRACKED_FILES) {
  if (IGNORE_PATTERNS.some((pattern) => pattern.test(file))) continue;

  try {
    const content = readFileSync(file, 'utf8');
    const matches = content.match(GEMINI_KEY_PATTERN);
    if (!matches) continue;

    findings.push({
      file,
      keys: [...new Set(matches)],
    });
  } catch {
    // Skip unreadable/non-text files.
  }
}

if (findings.length > 0) {
  console.error('\nSecret check failed: ditemukan pola API key di file yang terlacak git.\n');
  findings.forEach((finding) => {
    console.error(`- ${finding.file}`);
    finding.keys.forEach((key) => {
      const masked = `${key.slice(0, 8)}...${key.slice(-4)}`;
      console.error(`  key: ${masked}`);
    });
  });
  console.error('\nPindahkan key ke `.env.local` atau session override, lalu commit ulang.\n');
  process.exit(1);
}

console.log('Secret check passed: tidak ada pola API key di tracked files.');

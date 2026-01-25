// scripts/etl/download_samples.js
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const RAW_DIR = path.join(process.cwd(), 'data/raw');
if (!fs.existsSync(RAW_DIR)) fs.mkdirSync(RAW_DIR, { recursive: true });

const SOURCES = [
  {
    name: 'chinese-poetry-tang',
    // One file from Tang poetry (~44MB full repo, fetching single file ~1MB)
    url: 'https://raw.githubusercontent.com/chinese-poetry/chinese-poetry/master/json/poet.tang.0.json',
    file: 'poet.tang.0.json'
  },
  {
    name: 'chinese-poetry-song',
    // One file from Song poetry
    url: 'https://raw.githubusercontent.com/chinese-poetry/chinese-poetry/master/json/poet.song.0.json',
    file: 'poet.song.0.json'
  },
  {
    name: 'chinese-poetry-ci',
    // Song Ci
    url: 'https://raw.githubusercontent.com/chinese-poetry/chinese-poetry/master/ci/ci.song.0.json',
    file: 'ci.song.0.json'
  }
];

console.log("📥 Downloading sample data for analysis...");

for (const source of SOURCES) {
  const dest = path.join(RAW_DIR, source.file);
  if (fs.existsSync(dest)) {
    console.log(`✅ ${source.file} already exists.`);
    continue;
  }
  
  console.log(`⬇️ Fetching ${source.file}...`);
  try {
    // Use curl via execSync
    execSync(`curl -L "${source.url}" -o "${dest}"`, { stdio: 'inherit' });
    console.log(`✅ Saved to ${dest}`);
  } catch (e) {
    console.error(`❌ Failed to download ${source.file}:`, e.message);
  }
}

console.log("\n📊 Analysis Ready. Run 'bun run scripts/etl/analyze.js' (to be created) to inspect structure.");

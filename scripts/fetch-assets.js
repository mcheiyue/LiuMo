import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { finished } from 'stream/promises';

// Config
const REPO = 'mcheiyue/LiuMo-assets';
const ASSETS_DIR = path.join(process.cwd(), 'src-tauri', 'resources');
const FONTS_DIR = path.join(process.cwd(), 'public', 'fonts');

// Map remote filename -> local path
const RESOURCES = [
  {
    name: 'liumo_full.db.gz',
    dest: path.join(ASSETS_DIR, 'liumo_full.db.gz'),
    required: true
  },
  {
    name: 'LXGWWenKaiLite.ttf', // Check if release uses this name
    dest: path.join(FONTS_DIR, 'default.ttf'), // Rename to default.ttf
    required: true
  }
];

async function fetchRelease() {
  console.log(`🔍 Checking latest release for ${REPO}...`);
  const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`);
  
  if (!res.ok) {
    if (res.status === 404) {
        console.warn('⚠️ No release found yet. Skipping download (Dev mode?).');
        return;
    }
    throw new Error(`Failed to fetch release info: ${res.statusText}`);
  }
  
  const release = await res.json();
  console.log(`✨ Found release: ${release.tag_name}`);
  
  for (const resource of RESOURCES) {
    const asset = release.assets.find(a => a.name === resource.name);
    if (!asset) {
      if (resource.required) console.error(`❌ Asset not found in release: ${resource.name}`);
      continue;
    }
    
    console.log(`⬇️ Downloading ${resource.name} (${(asset.size / 1024 / 1024).toFixed(2)} MB)...`);
    await downloadFile(asset.browser_download_url, resource.dest);
  }
}

async function downloadFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.statusText}`);
  
  // Ensure dir exists
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  
  const fileStream = fs.createWriteStream(destPath);
  await finished(Readable.fromWeb(res.body).pipe(fileStream));
  console.log(`✅ Saved to ${destPath}`);
}

fetchRelease().catch(err => {
  console.error('💥 Error fetching assets:', err);
  process.exit(1);
});

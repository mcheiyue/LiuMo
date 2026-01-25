import fs from 'fs';
import path from 'path';
import { Database } from 'bun:sqlite';
import * as OpenCC from 'opencc-js';
import crypto from 'crypto';

// --- Configuration ---
const RAW_DIR = path.join(process.cwd(), 'data/raw');
const DB_PATH = path.join(process.cwd(), 'data/liumo_full.db');
const CHINESE_POETRY_PATH = path.join(RAW_DIR, 'chinese-poetry');
const MODERN_POETRY_PATH = path.join(RAW_DIR, 'modern-poetry');

// Setup Converter (Traditional -> Simplified)
const convert = OpenCC.Converter({ from: 'hk', to: 'cn' });

// --- Database Setup ---
if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH); // Start fresh
const db = new Database(DB_PATH, { create: true });
db.run("PRAGMA journal_mode = WAL;");
db.run("PRAGMA synchronous = NORMAL;");

db.run(`
  CREATE TABLE IF NOT EXISTS poetry (
    id TEXT PRIMARY KEY,
    title TEXT,
    author TEXT,
    dynasty TEXT,
    content TEXT,
    type TEXT,
    source TEXT
  )
`);
db.run(`
  CREATE VIRTUAL TABLE IF NOT EXISTS poetry_fts USING fts5(
    title, author, content
  )
`);

const insertStmt = db.prepare(`
  INSERT OR IGNORE INTO poetry (id, title, author, dynasty, content, type, source)
  VALUES ($id, $title, $author, $dynasty, $content, $type, $source)
`);

const insertBatch = db.transaction((poems) => {
  for (const p of poems) {
    if (!p.content || p.content.length === 0) continue;
    
    insertStmt.run({
      $id: p.id,
      $title: p.title || '无题',
      $author: p.author || '佚名',
      $dynasty: p.dynasty || '未知',
      $content: JSON.stringify(p.content),
      $type: p.type || 'unknown',
      $source: p.source
    });
  }
});

// --- Helper Functions ---

function safeReadJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    return null;
  }
}

// Normalize content to string[]
function normalizeContent(rawContent) {
    if (Array.isArray(rawContent)) {
        return rawContent.map(l => convert(String(l)));
    }
    if (typeof rawContent === 'string') {
        // If it contains newlines, split by them
        if (rawContent.includes('\n')) {
            return rawContent.split('\n').map(l => convert(l.trim())).filter(l => l);
        }
        return [convert(rawContent)];
    }
    return [];
}

// Processor for standard array files
function processStandardArray(filePath, dynasty, type, source = 'chinese-poetry') {
  const raw = safeReadJSON(filePath);
  if (!raw || !Array.isArray(raw)) return;

  const batch = raw.map(p => ({
    id: p.id || crypto.randomUUID(),
    title: convert(p.title || p.rhythmic || '无题'), // Unified title
    author: convert(p.author || '佚名'),
    dynasty: dynasty,
    content: normalizeContent(p.paragraphs || p.content), // Unified content
    type: type,
    source: source
  }));
  insertBatch(batch);
}

// Processor for single object files (like Qianziwen)
function processSingleObject(filePath, dynasty, type, source = 'chinese-poetry') {
    const p = safeReadJSON(filePath);
    if (!p || Array.isArray(p)) return; // Skip if it's actually an array

    const item = {
        id: crypto.randomUUID(),
        title: convert(p.title || '无题'),
        author: convert(p.author || '佚名'),
        dynasty: dynasty,
        content: normalizeContent(p.paragraphs || p.content),
        type: type,
        source: source
    };
    insertBatch([item]);
}

// --- Main Processors ---

async function processShi(rootPath) {
  console.log("📦 Processing Shi (Tang/Song/Ming/Qing)...");
  
  const dirMap = [
    { dir: 'json', dynasty: '唐', type: 'shi' },
    { dir: '全唐诗', dynasty: '唐', type: 'shi' },
    { dir: 'wudai', dynasty: '五代', type: 'shi' },
    { dir: '五代诗词', dynasty: '五代', type: 'shi' },
    { dir: 'caocao', dynasty: '汉', type: 'shi' },
    { dir: '曹操诗集', dynasty: '汉', type: 'shi' },
    { dir: '楚辞', dynasty: '先秦', type: 'shi' },
    { dir: '纳兰性德', dynasty: '清', type: 'ci' },
    { dir: '御定全唐詩/json', dynasty: '唐', type: 'shi' }
  ];

  for (const item of dirMap) {
    const targetDir = path.join(rootPath, item.dir);
    if (!fs.existsSync(targetDir)) continue;

    const files = fs.readdirSync(targetDir);
    let count = 0;
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      processStandardArray(path.join(targetDir, file), item.dynasty, item.type);
      count++;
    }
    if (count > 0) process.stdout.write(` [${item.dir}: ${count}] `);
  }

  // Add Shui Mo Tang Shi (Single file in folder)
  const shuimoPath = path.join(rootPath, '水墨唐诗', 'shuimotangshi.json');
  if (fs.existsSync(shuimoPath)) {
      processStandardArray(shuimoPath, '唐', 'shi');
      console.log(' [水墨唐诗]');
  }
}

// Processor for You Meng Ying
function processYouMengYing(filePath) {
    const raw = safeReadJSON(filePath);
    if (!raw || !Array.isArray(raw)) return;

    const batch = raw.map(p => ({
        id: crypto.randomUUID(),
        title: '幽梦影',
        author: '张潮',
        dynasty: '清',
        content: normalizeContent([p.content, ...(p.comment || []).map(c => `评: ${c}`)]), 
        type: 'prose',
        source: 'chinese-poetry'
    }));
    insertBatch(batch);
    console.log(` ✅ Added ${batch.length} entries from You Meng Ying`);
}

async function processCi(rootPath) {
  console.log("\n📦 Processing Ci (Song)...");
  const possibleDirs = ['ci', '宋词'];
  
  for (const d of possibleDirs) {
      const ciDir = path.join(rootPath, d);
      if (fs.existsSync(ciDir)) {
        const files = fs.readdirSync(ciDir).filter(f => f.endsWith('.json'));
        let count = 0;
        for (const file of files) {
          processStandardArray(path.join(ciDir, file), '宋', 'ci');
          count++;
        }
        if (count > 0) process.stdout.write(` [${d}: ${count}] `);
      }
  }
}

// Processor for Guwen Guanzhi (Nested Structure)
function processGuwenGuanzhi(filePath) {
    const raw = safeReadJSON(filePath);
    if (!raw || !raw.content || !Array.isArray(raw.content)) return;

    let poems = [];
    // Level 1: Volumes (e.g., 卷一・周文)
    for (const volume of raw.content) {
        if (!volume.content || !Array.isArray(volume.content)) continue;
        
        // Level 2: Chapters (e.g., 鄭伯克段於鄢)
        for (const chapter of volume.content) {
            poems.push({
                id: crypto.randomUUID(),
                title: convert(chapter.chapter || '无题'),
                author: convert(chapter.author || '佚名'),
                dynasty: '古文', // Guwen spans many dynasties, use generic tag or parse from author
                content: normalizeContent(chapter.paragraphs),
                type: 'prose',
                source: 'chinese-poetry'
            });
        }
    }
    insertBatch(poems);
    console.log(` ✅ Extracted ${poems.length} articles from Guwen Guanzhi`);
}

async function processMengxue(rootPath) {
    console.log("\n📦 Processing Mengxue (Classics)...");
    const dirs = ['mengxue', '蒙学'];
    for (const d of dirs) {
        const targetDir = path.join(rootPath, d);
        if (fs.existsSync(targetDir)) {
            const files = fs.readdirSync(targetDir).filter(f => f.endsWith('.json'));
            for (const file of files) {
                const fullPath = path.join(targetDir, file);
                
                // Special handler for Guwen Guanzhi
                if (file === 'guwenguanzhi.json') {
                    processGuwenGuanzhi(fullPath);
                    continue;
                }

                // Mengxue files are usually single objects
                processSingleObject(fullPath, '蒙学', 'prose');
                process.stdout.write('.');
            }
        }
    }
    
    // Process You Meng Ying
    const ymyPath = path.join(rootPath, '幽梦影', 'youmengying.json');
    if (fs.existsSync(ymyPath)) {
        processYouMengYing(ymyPath);
    }
}

async function processClassics(rootPath) {
  console.log("\n📦 Processing Classics (Shijing, Lunyu, etc)...");
  
  // Shijing & Lunyu (Single big files or directory of chapters)
  const map = [
      { dir: 'shijing', file: 'shijing.json', dynasty: '先秦', type: 'prose' },
      { dir: '诗经', file: 'shijing.json', dynasty: '先秦', type: 'prose' },
      { dir: 'lunyu', file: 'lunyu.json', dynasty: '春秋', type: 'prose' },
      { dir: '论语', file: 'lunyu.json', dynasty: '春秋', type: 'prose' },
  ];

  for (const item of map) {
      const targetPath = path.join(rootPath, item.dir, item.file);
      if (fs.existsSync(targetPath)) {
          // These files are ARRAYS of chapters/poems
          processStandardArray(targetPath, item.dynasty, item.type);
          console.log(` ✅ Added ${item.dir}`);
      }
  }
  
  // Sishuwujing
  const sishuDirs = ['sishuwujing', '四书五经'];
  for (const d of sishuDirs) {
      const targetDir = path.join(rootPath, d);
      if (fs.existsSync(targetDir)) {
          const files = fs.readdirSync(targetDir).filter(f => f.endsWith('.json'));
          for (const file of files) {
              processStandardArray(path.join(targetDir, file), '先秦', 'prose');
          }
          console.log(` ✅ Added Sishuwujing from ${d}`);
      }
  }

  // Guwen Guanzhi (Classical Prose)
  console.log("\n📦 Processing Guwen Guanzhi (Masterpieces)...");
  // Check typical paths
  const guwenPaths = [
      path.join(rootPath, 'guwenguanzhi', 'guwenguanzhi.json'),
      path.join(rootPath, '古文观止', 'guwenguanzhi.json'),
      path.join(rootPath, '蒙学', 'guwenguanzhi.json') // Sometimes here in mirrors
  ];

  for (const p of guwenPaths) {
      if (fs.existsSync(p)) {
          const raw = safeReadJSON(p);
          if (raw && Array.isArray(raw)) {
              const batch = raw.map(item => ({
                  id: crypto.randomUUID(),
                  title: convert(item.title || '无题'),
                  author: convert(item.author || '佚名'),
                  dynasty: convert(item.dynasty || '未知'),
                  content: normalizeContent(item.paragraphs || item.content),
                  type: 'prose',
                  source: 'chinese-poetry'
              }));
              insertBatch(batch);
              console.log(` ✅ Added ${batch.length} Classic Prose from ${path.basename(path.dirname(p))}`);
              break; 
          }
      }
  }
}

async function processYuanQu(rootPath) {
    console.log("\n📦 Processing Yuan Qu...");
    const dirs = ['yuan', '元曲'];
    for (const d of dirs) {
        const targetPath = path.join(rootPath, d, 'yuanqu.json');
        if (fs.existsSync(targetPath)) {
            processStandardArray(targetPath, '元', 'qu');
            console.log(` ✅ Added Yuan Qu from ${d}`);
        }
    }
}

async function processModern() {
  console.log("\n📦 Processing Modern Poetry...");
  // Recursively find all JSONs in China-modern-poetry
  const root = path.join(MODERN_POETRY_PATH, 'China-modern-poetry');
  if (!fs.existsSync(root)) {
      console.warn("⚠️ China-modern-poetry not found.");
      return;
  }

  function scanDir(dir) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
              scanDir(fullPath);
          } else if (file.endsWith('.json')) {
              // Modern poetry files are arrays of poems
              // Field 'paragraphs' is string, 'content' is sometimes used
              processStandardArray(fullPath, '现代', 'modern', 'modern-poetry');
              process.stdout.write('.');
          }
      }
  }
  
  scanDir(root);
}

// --- Run ---
(async () => {
  console.log("🚀 Starting ULTIMATE ETL Pipeline (Local Scan)...");
  
  if (fs.existsSync(CHINESE_POETRY_PATH)) {
      await processShi(CHINESE_POETRY_PATH);
      await processCi(CHINESE_POETRY_PATH);
      await processClassics(CHINESE_POETRY_PATH);
      await processYuanQu(CHINESE_POETRY_PATH);
      await processMengxue(CHINESE_POETRY_PATH);
  } else {
      console.error("❌ 'data/raw/chinese-poetry' not found!");
  }

  if (fs.existsSync(MODERN_POETRY_PATH)) {
      await processModern();
  } else {
      console.error("❌ 'data/raw/modern-poetry' not found!");
  }

  console.log("\n\n🧹 Optimizing Database (VACUUM)...");
  db.run("VACUUM;");
  
  const count = db.query("SELECT COUNT(*) as c FROM poetry").get();
  console.log(`\n✅ Database generated successfully!`);
  console.log(`📍 Path: ${DB_PATH}`);
  console.log(`📚 Total Poems: ${count.c}`);
  
  db.close();
})();

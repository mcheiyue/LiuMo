// scripts/etl/analyze_and_clean.js
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const RAW_DIR = path.join(process.cwd(), 'data/raw');
// Create distinct output files for each major collection
const OUTPUT_DIR = path.join(process.cwd(), 'data/cleaned');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

console.log("🧹 Starting ETL Process (Partitioned Strategy)...");

const files = fs.readdirSync(RAW_DIR).filter(f => f.endsWith('.json'));

// Buffers for partitioned data
const collections = {
  tang: [],
  song_shi: [],
  song_ci: [],
  other: []
};

for (const file of files) {
  const filePath = path.join(RAW_DIR, file);
  console.log(`Processing ${file}...`);
  
  const rawData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  
  // Determine Collection Partition
  let targetCollection = 'other';
  let type = 'unknown';
  let dynasty = 'Unknown';
  
  if (file.includes('tang')) {
    targetCollection = 'tang';
    type = 'shi';
    dynasty = '唐';
  } else if (file.includes('song') && file.includes('ci')) {
    targetCollection = 'song_ci';
    type = 'ci';
    dynasty = '宋';
  } else if (file.includes('song')) {
    targetCollection = 'song_shi';
    type = 'shi';
    dynasty = '宋';
  }

  // Normalize
  const cleaned = rawData.map(item => {
    const title = item.title || item.rhythmic || 'Untitled';
    const id = item.id || crypto.randomUUID();
    const content = Array.isArray(item.paragraphs) ? item.paragraphs : [item.paragraphs];
    
    return {
      id,
      title,
      author: item.author || 'Unknown',
      dynasty,
      content,
      type
    };
  });
  
  collections[targetCollection].push(...cleaned);
}

// Write Separate Files
console.log("\n📊 Analysis & Partitioning Report:");
console.log(`---------------------------------`);

Object.entries(collections).forEach(([key, data]) => {
  if (data.length > 0) {
    const outputPath = path.join(OUTPUT_DIR, `liumo_${key}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(`✅ [${key}] Saved ${data.length} poems to: ${outputPath}`);
  }
});

console.log(`\n✨ ETL Complete. Ready for SQLite bulk insert.`);

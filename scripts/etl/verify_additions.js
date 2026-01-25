import { Database } from 'bun:sqlite';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data/liumo_full.db');
const db = new Database(DB_PATH, { readonly: true });

console.log("🔍 Verifying Data Integrity...");

// 1. Check Total Count
const total = db.query("SELECT COUNT(*) as c FROM poetry").get();
console.log(`Total Poems: ${total.c}`);

// 2. Check You Meng Ying
const ymy = db.query("SELECT COUNT(*) as c FROM poetry WHERE title = '幽梦影'").get();
console.log(`You Meng Ying Entries: ${ymy.c} (Expected ~219)`);

// 3. Sample a You Meng Ying entry
const ymySample = db.query("SELECT * FROM poetry WHERE title = '幽梦影' LIMIT 1").get();
console.log("Sample You Meng Ying:", ymySample ? "Found" : "NOT FOUND");
if (ymySample) console.log(`  Content: ${ymySample.content.substring(0, 50)}...`);

// 4. Check details by Dynasty
const dynastyCounts = db.query("SELECT dynasty, COUNT(*) as c FROM poetry GROUP BY dynasty").all();
console.table(dynastyCounts);

db.close();

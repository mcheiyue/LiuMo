import { Database } from 'bun:sqlite';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'temp_verify.db'); // Already decompressed
const db = new Database(DB_PATH);

console.log('--- 🟢 FINAL DATA VERIFICATION ---');

// 1. Verify Modern Poetry
const modern = db.query("SELECT title, author, content FROM poetry WHERE type = 'modern' AND author = '海子' LIMIT 1").get();
console.log(`[Modern] Found: ${modern ? '✅ ' + modern.title + ' (' + modern.author + ')' : '❌'}`);

// 2. Verify Classical Prose (Guwen)
const prose = db.query("SELECT title, author, dynasty FROM poetry WHERE title LIKE '%岳阳楼记%'").get();
console.log(`[Prose]  Found: ${prose ? '✅ ' + prose.title + ' (' + prose.author + '·' + prose.dynasty + ')' : '❌'}`);

// 3. Verify Total Count
const count = db.query("SELECT count(*) as total FROM poetry").get();
console.log(`[Total]  Count: ${count.total.toLocaleString()} entries`);

db.close();
fs.unlinkSync(DB_PATH); // Clean up
console.log('--- Verification Complete ---');

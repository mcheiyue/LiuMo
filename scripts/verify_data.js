import { Database } from 'bun:sqlite';
import path from 'path';
import fs from 'fs';
import zlib from 'zlib';

const GZ_PATH = path.join(process.cwd(), 'src-tauri/resources/liumo_full.db.gz');
const DB_PATH = path.join(process.cwd(), 'temp_verify.db');

console.log('1. Checking resource file...');
if (!fs.existsSync(GZ_PATH)) {
    console.error('❌ GZ file missing:', GZ_PATH);
    process.exit(1);
}
console.log('✅ GZ file found:', (fs.statSync(GZ_PATH).size / 1024 / 1024).toFixed(2), 'MB');

console.log('2. Decompressing for verification...');
const gzipBuffer = fs.readFileSync(GZ_PATH);
const dbBuffer = zlib.gunzipSync(gzipBuffer);
fs.writeFileSync(DB_PATH, dbBuffer);

const db = new Database(DB_PATH);

console.log('3. Verifying Categories...');
const categories = db.query("SELECT category, COUNT(*) as count FROM poetry GROUP BY category").all();
console.table(categories);

console.log('4. Verifying Specific Entries...');
const yueyang = db.query("SELECT title, author, category FROM poetry WHERE title LIKE '%岳阳楼记%'").get();
const haizi = db.query("SELECT title, author, category FROM poetry WHERE author = '海子' LIMIT 1").get();

console.log('岳阳楼记:', yueyang || '❌ NOT FOUND');
console.log('海子:', haizi || '❌ NOT FOUND');

db.close();
fs.unlinkSync(DB_PATH); // Cleanup

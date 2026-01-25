import { Database } from 'bun:sqlite';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data/liumo_full.db');
const db = new Database(DB_PATH, { readonly: true });

console.log("📊 Database Statistics:");

const counts = db.query("SELECT type, COUNT(*) as count FROM poetry GROUP BY type").all();
console.table(counts);

const modernSample = db.query("SELECT * FROM poetry WHERE type = 'modern' LIMIT 1").get();
console.log("\nSample Modern Poem:", modernSample || "None");

const proseSample = db.query("SELECT * FROM poetry WHERE type = 'prose' LIMIT 1").get();
console.log("Sample Prose:", proseSample || "None");

db.close();

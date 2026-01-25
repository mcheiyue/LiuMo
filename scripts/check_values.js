import { Database } from 'bun:sqlite';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'temp_verify.db');
const db = new Database(DB_PATH);

console.log('--- TYPE Distribution ---');
const types = db.query("SELECT type, COUNT(*) as count FROM poetry GROUP BY type").all();
console.table(types);

console.log('--- DYNASTY Distribution ---');
const dynasties = db.query("SELECT dynasty, COUNT(*) as count FROM poetry GROUP BY dynasty").all();
console.table(dynasties);

db.close();

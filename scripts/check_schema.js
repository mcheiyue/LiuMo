import { Database } from 'bun:sqlite';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'temp_verify.db');
const db = new Database(DB_PATH);

console.log('--- Table Schema ---');
const schema = db.query("PRAGMA table_info(poetry)").all();
console.table(schema);

db.close();

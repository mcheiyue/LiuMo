import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';

const root = process.cwd();
const gzPath = join(root, 'src-tauri/resources/liumo_v8.db.gz');
const dbPath = join(root, 'temp_verify.db');
const pyPath = join(root, 'temp_verify_v8.py');

const requiredColumns = [
  'id',
  'title',
  'author',
  'dynasty',
  'content_json',
  'layout_strategy',
  'tags',
  'source',
];

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

async function main() {
  console.log('1. Checking resource file...');
  if (!existsSync(gzPath)) {
    fail(`GZ file missing: ${gzPath}`);
  }

  const gzBuffer = await readFile(gzPath);
  console.log('✅ GZ file found:', (gzBuffer.length / 1024 / 1024).toFixed(2), 'MB');

  console.log('2. Decompressing for verification...');
  await writeFile(dbPath, gunzipSync(gzBuffer));

  const script = `
import json
import sqlite3
import sys

db_path = sys.argv[1]
required_columns = ${JSON.stringify(requiredColumns)}

conn = sqlite3.connect(db_path)
try:
    integrity = conn.execute('PRAGMA integrity_check').fetchone()
    if not integrity or integrity[0] != 'ok':
        raise SystemExit(f'integrity_check failed: {integrity}')

    tables = {row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type IN ('table', 'virtual table')")}
    if 'poetry' not in tables:
        raise SystemExit('missing table: poetry')
    if 'poetry_fts' not in tables:
        raise SystemExit('missing table: poetry_fts')

    columns = {row[1] for row in conn.execute('PRAGMA table_info(poetry)')}
    missing = [column for column in required_columns if column not in columns]
    if missing:
        raise SystemExit('missing V8 columns: ' + ', '.join(missing))

    total = conn.execute('SELECT COUNT(*) FROM poetry').fetchone()[0]
    if total <= 0:
        raise SystemExit('poetry table is empty')

    sample = conn.execute('SELECT content_json, tags FROM poetry LIMIT 1').fetchone()
    if not sample:
        raise SystemExit('sample row not found')
    json.loads(sample[0])
    json.loads(sample[1])

    fts = conn.execute("SELECT rowid FROM poetry_fts WHERE poetry_fts MATCH ? LIMIT 1", ('春',)).fetchone()
    print('OK integrity_check ok')
    print('OK Required V8 columns found: ' + ', '.join(required_columns))
    print(f'OK Rows: {total} FTS smoke: {"hit" if fts else "no hit"}')
finally:
    conn.close()
`;

  await writeFile(pyPath, script, 'utf8');
  const result = spawnSync('python', [pyPath, dbPath], { encoding: 'utf8' });
  await rm(pyPath, { force: true });
  await rm(dbPath, { force: true });

  if (result.error) {
    fail(`Python sqlite3 verification could not start: ${result.error.message}`);
  }

  if (result.status !== 0) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    fail(`V8 database verification failed with exit code ${result.status}`);
  }

  process.stdout.write(result.stdout);
  console.log('✅ V8 database verification passed');
}

main().catch(async (error) => {
  await rm(pyPath, { force: true }).catch(() => undefined);
  await rm(dbPath, { force: true }).catch(() => undefined);
  fail(error instanceof Error ? error.message : String(error));
});

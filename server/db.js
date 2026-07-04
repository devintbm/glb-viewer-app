import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'models.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Schema: model metadata lives in SQLite. The binary GLB itself is stored on
// disk (server/uploads) and referenced by `filename` — storing large binary
// blobs directly inside a relational DB is generally an anti-pattern
// (bloats backups, slows queries), so we keep the DB fast and lean and let
// the filesystem (or, in production, an object store like S3) hold the bytes.
db.exec(`
  CREATE TABLE IF NOT EXISTS models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT DEFAULT 'model/gltf-binary',
    tags TEXT DEFAULT '',
    uploaded_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

export default db;

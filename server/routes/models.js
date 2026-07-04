import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = `${uuidv4()}.glb`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB cap, adjust as needed
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.glb') {
      return cb(new Error('Only .glb files are allowed'));
    }
    cb(null, true);
  },
});

const router = express.Router();

// GET /api/models - list all models (metadata only)
router.get('/', (req, res) => {
  const rows = db
    .prepare('SELECT id, name, description, file_size, mime_type, tags, uploaded_at, updated_at FROM models ORDER BY uploaded_at DESC')
    .all();
  res.json(rows);
});

// GET /api/models/:id - single model metadata
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM models WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Model not found' });
  const { filename, ...safe } = row;
  res.json(safe);
});

// GET /api/models/:id/file - stream the actual GLB binary
router.get('/:id/file', (req, res) => {
  const row = db.prepare('SELECT filename, original_filename, mime_type FROM models WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Model not found' });
  const filePath = path.join(UPLOAD_DIR, row.filename);

  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch {
    return res.status(404).json({ error: 'File missing on disk' });
  }

  res.setHeader('Content-Type', row.mime_type || 'model/gltf-binary');
  res.setHeader('Content-Disposition', `inline; filename="${row.original_filename}"`);
  res.setHeader('Content-Length', stat.size);
  // Prevent the browser from serving a stale/partial cached copy of the file
  res.setHeader('Cache-Control', 'no-store');

  const stream = fs.createReadStream(filePath);

  // Without this, a disk read error (locked file, permissions, antivirus scan,
  // etc.) leaves the response hanging forever with no error — which looks
  // exactly like an infinite "loading" spinner on the frontend. Handling the
  // error here turns that silent hang into an actual, visible failure.
  stream.on('error', (err) => {
    console.error(`Error streaming model file ${row.filename}:`, err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to read model file from disk' });
    } else {
      res.destroy();
    }
  });

  stream.pipe(res);
});

// POST /api/models - upload a new model (multipart/form-data: file, name, description, tags)
router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded (field name must be "file")' });
  const { name, description = '', tags = '' } = req.body;
  if (!name || !name.trim()) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Model name is required' });
  }

  const stmt = db.prepare(`
    INSERT INTO models (name, description, filename, original_filename, file_size, mime_type, tags)
    VALUES (@name, @description, @filename, @original_filename, @file_size, @mime_type, @tags)
  `);
  const info = stmt.run({
    name: name.trim(),
    description,
    filename: req.file.filename,
    original_filename: req.file.originalname,
    file_size: req.file.size,
    mime_type: 'model/gltf-binary',
    tags,
  });

  const created = db.prepare('SELECT id, name, description, file_size, mime_type, tags, uploaded_at, updated_at FROM models WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(created);
});

// PUT /api/models/:id - update metadata (name/description/tags only, not the file)
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM models WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Model not found' });

  const { name, description, tags } = req.body;
  db.prepare(`
    UPDATE models
    SET name = COALESCE(?, name),
        description = COALESCE(?, description),
        tags = COALESCE(?, tags),
        updated_at = datetime('now')
    WHERE id = ?
  `).run(name, description, tags, req.params.id);

  const updated = db.prepare('SELECT id, name, description, file_size, mime_type, tags, uploaded_at, updated_at FROM models WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /api/models/:id - remove metadata row + file from disk
router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM models WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Model not found' });

  const filePath = path.join(UPLOAD_DIR, existing.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  db.prepare('DELETE FROM models WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

export default router;

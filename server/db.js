import sqlite3 from 'sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = join(fileURLToPath(import.meta.url), '..');
const dbPath = join(process.cwd(), 'data', 'projects.db');

if (!existsSync(join(process.cwd(), 'data'))) {
  mkdirSync(join(process.cwd(), 'data'), { recursive: true });
}

const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastInsertRowid: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

await run(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('egitim', 'kisisel', 'arastirma')),
    status TEXT NOT NULL CHECK (status IN ('aktif', 'beklemede', 'fikir', 'arsiv')),
    notes TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

export async function getAllProjects(filters = {}) {
  let sql = 'SELECT * FROM projects';
  const params = [];
  const conditions = [];

  if (filters.category) {
    conditions.push('category = ?');
    params.push(filters.category);
  }
  if (filters.status) {
    conditions.push('status = ?');
    params.push(filters.status);
  }
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ' ORDER BY updated_at DESC';

  return all(sql, params);
}

export async function getProjectById(id) {
  return get('SELECT * FROM projects WHERE id = ?', [id]);
}

export async function createProject({ title, category, status = 'aktif', notes = '' }) {
  const result = await run(
    'INSERT INTO projects (title, category, status, notes) VALUES (?, ?, ?, ?)',
    [title, category, status, notes]
  );
  return getProjectById(result.lastInsertRowid);
}

export async function updateProject(id, updates) {
  const fields = [];
  const params = [];
  const allowedFields = ['title', 'category', 'status', 'notes'];

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = ?`);
      params.push(value);
    }
  }
  if (fields.length === 0) return getProjectById(id);

  fields.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id);

  await run(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`, params);
  return getProjectById(id);
}

export async function deleteProject(id) {
  return run('DELETE FROM projects WHERE id = ?', [id]);
}

export async function getStaleProjects(days = 7) {
  return all(
    `SELECT * FROM projects 
     WHERE status = 'aktif' 
     AND updated_at < datetime('now', ?)
     ORDER BY updated_at ASC`,
    [`-${days} days`]
  );
}

export async function isAgentAvailable() {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    return response.ok;
  } catch {
    return false;
  }
}

export default db;
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "..", "data", "database.sqlite");

// Initialize database
const db = new Database(dbPath);

// Enable foreign keys
db.pragma("foreign_keys = ON");

// Initialize database schema
function initializeSchema() {
  // Projects table
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      generated_model_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT current_timestamp,
      deleted_at TEXT
    )
  `);
  // Documents table
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      version_id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      words_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT current_timestamp,
      deleted_at TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);

  // Models table
  db.exec(`
    CREATE TABLE IF NOT EXISTS models (
      version_id TEXT PRIMARY KEY,
      model_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      selected_words_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT current_timestamp,
      deleted_at TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);

  // Traces table
  db.exec(`
    CREATE TABLE IF NOT EXISTS traces (
      id TEXT PRIMARY KEY,
      document_version_id TEXT NOT NULL,
      model_version_id TEXT NOT NULL,
      selections TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT current_timestamp,
      deleted_at TEXT,
      FOREIGN KEY (document_version_id) REFERENCES documents(version_id),
      FOREIGN KEY (model_version_id) REFERENCES models(version_id)
    )
  `);
  // Model stat updates table
  db.exec(`
    CREATE TABLE IF NOT EXISTS model_update_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model_version_id TEXT NOT NULL,
      type TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT current_timestamp,
      deleted_at TEXT,
      FOREIGN KEY (model_version_id) REFERENCES models(version_id)
    )
  `);

  // Create indexes for common queries
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id)`,
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_models_project_id ON models(project_id)`,
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_traces_document_version_id ON traces(document_version_id)`,
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_traces_model_version_id ON traces(model_version_id)`,
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_model_update_events_model_version_id ON model_update_events(model_version_id)`,
  );
}

initializeSchema();

export default db;

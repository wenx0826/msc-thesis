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
      latest_model_number INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT current_timestamp,
      deleted_at TEXT
    )
  `);
  // Documents table
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      latest_version_id TEXT,
      latest_version_number INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT current_timestamp,
      deleted_at TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (latest_version_id) REFERENCES document_versions(id)
    )
  `);
  // Document_versions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS document_versions (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      version_number INTEGER NOT NULL,
      name TEXT NOT NULL,
      filename TEXT NOT NULL,
      words_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT current_timestamp,
      FOREIGN KEY (document_id) REFERENCES documents(id)
    )
  `);
  // Models table
  db.exec(`
    CREATE TABLE IF NOT EXISTS models (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      latest_version_id TEXT,
      latest_version_number INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT current_timestamp,
      deleted_at TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (latest_version_id) REFERENCES model_versions(id)
    )
  `);
  // Model Versions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS model_versions (
      id TEXT PRIMARY KEY,
      model_id TEXT NOT NULL,
      version_number INTEGER NOT NULL,
      name TEXT NOT NULL,
      selected_words_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT current_timestamp,
      FOREIGN KEY (model_id) REFERENCES models(id)
    )
  `);

  // Traces table
  db.exec(`
    CREATE TABLE IF NOT EXISTS traces (
      id TEXT PRIMARY KEY,
      trace_id TEXT,
      document_version_id TEXT NOT NULL,
      model_version_id TEXT NOT NULL,
      selections TEXT NOT NULL,
      is_latest BOOLEAN NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT current_timestamp,
      FOREIGN KEY (document_version_id) REFERENCES document_versions(id),
      FOREIGN KEY (model_version_id) REFERENCES model_versions(id)
    )
  `);
  // Model stat updates table
  db.exec(`
    CREATE TABLE IF NOT EXISTS model_update_events (
      id TEXT PRIMARY KEY,
      model_version_id TEXT NOT NULL,
      type TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT current_timestamp,
      deleted_at TEXT,
      FOREIGN KEY (model_version_id) REFERENCES model_versions(id)
    )
  `);

  //
  db.exec(`
    CREATE TABLE IF NOT EXISTS model_subprocesses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model_version_id TEXT NOT NULL,
      task_id TEXT NOT NULL,
      subprocess_model_version_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT current_timestamp,
      deleted_at TEXT,
      FOREIGN KEY (model_version_id) REFERENCES model_versions(id)
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
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_document_versions_document_id_version_number ON document_versions(document_id, version_number)`,
  );
  db.exec(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_model_versions_model_id_version_number ON model_versions(model_id, version_number)`,
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

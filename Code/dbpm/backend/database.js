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
      model_generation_counter INTEGER NOT NULL DEFAULT 0,
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
      created_at TEXT NOT NULL DEFAULT current_timestamp,
      deleted_at TEXT,
      words INTEGER DEFAULT 0,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // Models table
  db.exec(`
    CREATE TABLE IF NOT EXISTS models (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      name TEXT NOT NULL,
      regenerated_by_prompt_times INTEGER DEFAULT 0,
      regenerated_by_selections_times INTEGER DEFAULT 0,
      selected_text_words INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT current_timestamp,
      deleted_at TEXT,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    )
  `);

  // Traces table
  db.exec(`
    CREATE TABLE IF NOT EXISTS traces (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      model_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT current_timestamp,
      deleted_at TEXT,
      selections TEXT NOT NULL,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
      FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE
    )
  `);
  // Model stat updates table
  db.exec(`
    CREATE TABLE IF NOT EXISTS model_change_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model_id TEXT NOT NULL,
      type TEXT NOT NULL,
      words INTEGER,
      created_at TEXT NOT NULL DEFAULT current_timestamp,
      deleted_at TEXT,
      FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE
    )
  `);

  // Create indexes for common queries
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id)`,
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_models_document_id ON models(document_id)`,
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_traces_document_id ON traces(document_id)`,
  );
  db.exec(`CREATE INDEX IF NOT EXISTS idx_traces_model_id ON traces(model_id)`);
}

initializeSchema();

export default db;

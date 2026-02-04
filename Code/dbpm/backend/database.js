const Database = require("better-sqlite3");
const path = require("path");

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
      createdAt TEXT NOT NULL,
      generatedModelNumber INTEGER DEFAULT 0
    )
  `);

  // Documents table
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      uploadedAt TEXT NOT NULL,
      projectId TEXT NOT NULL,
      words INTEGER DEFAULT 0,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // Models table
  db.exec(`
    CREATE TABLE IF NOT EXISTS models (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      documentId TEXT NOT NULL,
      status TEXT DEFAULT 'generated',
      regeneratedByPromptTimes INTEGER DEFAULT 0,
      regeneratedBySelectionsTimes INTEGER DEFAULT 0,
      words INTEGER DEFAULT 0,
      deleted_at TEXT,
      FOREIGN KEY (documentId) REFERENCES documents(id) ON DELETE CASCADE
    )
  `);

  // Traces table
  db.exec(`
    CREATE TABLE IF NOT EXISTS traces (
      id TEXT PRIMARY KEY,
      documentId TEXT NOT NULL,
      modelId TEXT NOT NULL,
      prompt TEXT,
      selections TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (documentId) REFERENCES documents(id) ON DELETE CASCADE,
      FOREIGN KEY (modelId) REFERENCES models(id) ON DELETE CASCADE
    )
  `);

  // Model stat updates table
  db.exec(`
    CREATE TABLE IF NOT EXISTS model_stat_updates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      modelId TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      type TEXT NOT NULL,
      words INTEGER,
      FOREIGN KEY (modelId) REFERENCES models(id) ON DELETE CASCADE
    )
  `);

  // Create indexes for common queries
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_documents_projectId ON documents(projectId)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_models_documentId ON models(documentId)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_traces_documentId ON traces(documentId)`
  );
  db.exec(`CREATE INDEX IF NOT EXISTS idx_traces_modelId ON traces(modelId)`);
}

initializeSchema();

module.exports = db;

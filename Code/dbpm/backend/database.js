const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "..", "data", "database.sqlite");
let db;

// Initialize database
async function initDatabase() {
  const SQL = await initSqlJs();

  // Try to load existing database
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Enable foreign keys
  db.run("PRAGMA foreign_keys = ON");

  // Initialize database schema
  initializeSchema();

  // Save database
  saveDatabase();

  return db;
}

function saveDatabase() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

function initializeSchema() {
  // Projects table
  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      generatedModelNumber INTEGER DEFAULT 0
    )
  `);

  // Documents table
  db.run(`
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
  db.run(`
    CREATE TABLE IF NOT EXISTS models (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      documentId TEXT NOT NULL,
      status TEXT DEFAULT 'generated',
      regeneratedByPromptTimes INTEGER DEFAULT 0,
      regeneratedBySelectionsTimes INTEGER DEFAULT 0,
      words INTEGER DEFAULT 0,
      FOREIGN KEY (documentId) REFERENCES documents(id) ON DELETE CASCADE
    )
  `);

  // Traces table
  db.run(`
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
  db.run(`
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
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_documents_projectId ON documents(projectId)`,
  );
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_models_documentId ON models(documentId)`,
  );
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_traces_documentId ON traces(documentId)`,
  );
  db.run(`CREATE INDEX IF NOT EXISTS idx_traces_modelId ON traces(modelId)`);
}

// Helper functions to match better-sqlite3 API
const dbWrapper = {
  prepare(sql) {
    return {
      run(...params) {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        stmt.step();
        const changes = db.getRowsModified();
        stmt.free();
        saveDatabase();
        return { changes };
      },
      get(...params) {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        const result = stmt.step() ? stmt.getAsObject() : null;
        stmt.free();
        return result;
      },
      all(...params) {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        const results = [];
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
      },
    };
  },
  exec(sql) {
    db.run(sql);
    saveDatabase();
  },
  pragma(pragmaString) {
    db.run(`PRAGMA ${pragmaString}`);
  },
};

// Export a promise that resolves to the db wrapper
module.exports = initDatabase().then(() => dbWrapper);

import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "..", "persistence", "database.sqlite");

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
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
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
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
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
      restored_from TEXT,
      version_number INTEGER NOT NULL,
      name TEXT NOT NULL,
      filename TEXT NOT NULL,
      words_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      FOREIGN KEY (document_id) REFERENCES documents(id),
      FOREIGN KEY (restored_from) REFERENCES document_versions(id)
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
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
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
      restored_from TEXT,
      version_number INTEGER NOT NULL,
      name TEXT NOT NULL,
      selected_words_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      FOREIGN KEY (model_id) REFERENCES models(id),
      FOREIGN KEY (restored_from) REFERENCES model_versions(id)
    )
  `);

  // Document-model links table
  db.exec(`
    CREATE TABLE IF NOT EXISTS document_model_links (
      id TEXT PRIMARY KEY,
      document_version_id TEXT NOT NULL,
      model_version_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      FOREIGN KEY (document_version_id) REFERENCES document_versions(id),
      FOREIGN KEY (model_version_id) REFERENCES model_versions(id)
    )
  `);
  // Current selections per link (source of truth, soft deletable)
  db.exec(`
    CREATE TABLE IF NOT EXISTS document_model_link_selections (
      id TEXT PRIMARY KEY,
      link_id TEXT NOT NULL,
      start INTEGER NOT NULL,
      end INTEGER NOT NULL,
      exact TEXT NOT NULL,
      prefix TEXT,
      suffix TEXT,
      style TEXT NOT NULL CHECK (json_valid(style) AND json_type(style) = 'object'),
      review_status TEXT NOT NULL DEFAULT 'none'
        CHECK (review_status IN ('none', 'pending', 'notified')),
      deleted_at TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      FOREIGN KEY (link_id) REFERENCES document_model_links(id)
    )
  `);
  // Append-only selection history
  db.exec(`
    CREATE TABLE IF NOT EXISTS document_model_link_selection_history (
      id TEXT PRIMARY KEY,
      selection_id TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'manual' CHECK (type IN ('manual', 'auto_reanchor')),
      start INTEGER NOT NULL,
      end INTEGER NOT NULL,
      exact TEXT NOT NULL,
      prefix TEXT,
      suffix TEXT,
      style TEXT NOT NULL CHECK (json_valid(style) AND json_type(style) = 'object'),
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      FOREIGN KEY (selection_id) REFERENCES document_model_link_selections(id)
    )
  `);
  // Model version events table (manually authored changes + version lifecycle events)
  db.exec(`
    CREATE TABLE IF NOT EXISTS model_version_events (
      id TEXT PRIMARY KEY,
      model_version_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN (
        'manual_update_selections',
        'manual_update_graph_properties_only',
        'manual_update_graph_changed',
        'version_created_copy',
        'version_reverted',
        'selections_auto_reanchored'
      )),
      selected_words_count INTEGER,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      FOREIGN KEY (model_version_id) REFERENCES model_versions(id)
    )
  `);
  // Model generation attempts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS model_generation_attempts (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      base_model_version_id TEXT,
      result_model_version_id TEXT,
      generation_type TEXT NOT NULL CHECK (generation_type IN (
        'new',
        'regeneration',
        'refinement'
      )),
      generation_input_mode TEXT NOT NULL CHECK (generation_input_mode IN (
        'selection_only',
        'selection_with_prompt',
        'prompt'
      )),
      result TEXT NOT NULL CHECK (result IN (
        'accepted_new_model',
        'accepted_replace',
        'accepted_new_version',
        'declined'
      )),
      prompt TEXT,
      selected_words_count INTEGER,
      selected_text_similarity REAL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (base_model_version_id) REFERENCES model_versions(id),
      FOREIGN KEY (result_model_version_id) REFERENCES model_versions(id),
      CHECK (NOT (generation_type = 'new' AND result IN ('accepted_replace', 'accepted_new_version'))),
      CHECK (NOT (
        generation_type IN ('regeneration', 'refinement') AND
        result = 'accepted_new_model'
      )),
      CHECK (NOT (generation_type = 'new' AND base_model_version_id IS NOT NULL)),
      CHECK (NOT (
        generation_type IN ('regeneration', 'refinement') AND
        base_model_version_id IS NULL
      )),
      CHECK (NOT (
        generation_type = 'refinement' AND
        generation_input_mode != 'prompt'
      )),
      CHECK (NOT (
        generation_type IN ('new', 'regeneration') AND
        generation_input_mode = 'prompt'
      )),
      CHECK (NOT (generation_input_mode = 'selection_only' AND prompt IS NOT NULL)),
      CHECK (NOT (
        generation_input_mode IN ('selection_with_prompt', 'prompt') AND
        prompt IS NULL
      )),
      CHECK (NOT (generation_type = 'refinement' AND selected_words_count IS NOT NULL)),
      CHECK (NOT (generation_type = 'refinement' AND selected_text_similarity IS NOT NULL)),
      CHECK (NOT (generation_type = 'new' AND selected_text_similarity IS NOT NULL)),
      CHECK (
        (result = 'declined' AND result_model_version_id IS NULL) OR
        (result != 'declined' AND result_model_version_id IS NOT NULL)
      ),
      CHECK (selected_text_similarity IS NULL OR
             (selected_text_similarity >= 0.0 AND selected_text_similarity <= 1.0))
    )
  `);

  //
  db.exec(`
    CREATE TABLE IF NOT EXISTS model_subprocesses (
      id TEXT PRIMARY KEY,
      model_version_id TEXT NOT NULL,
      task_id TEXT NOT NULL,
      subprocess_model_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      deleted_at TEXT,
      FOREIGN KEY (model_version_id) REFERENCES model_versions(id),
      FOREIGN KEY (subprocess_model_id) REFERENCES models(id)
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
    `CREATE INDEX IF NOT EXISTS idx_document_model_links_document_version_id ON document_model_links(document_version_id)`,
  );
  db.exec(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_document_versions_document_id_version_number ON document_versions(document_id, version_number)`,
  );
  db.exec(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_model_versions_model_id_version_number ON model_versions(model_id, version_number)`,
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_document_model_links_model_version_id ON document_model_links(model_version_id)`,
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_document_model_link_selections_link_id ON document_model_link_selections(link_id)`,
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_document_model_link_selections_deleted_at ON document_model_link_selections(deleted_at)`,
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_document_model_link_selection_history_selection_id ON document_model_link_selection_history(selection_id)`,
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_document_model_link_selection_history_selection_id_created_at_id ON document_model_link_selection_history(selection_id, created_at DESC, id DESC)`,
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_model_version_events_model_version_id ON model_version_events(model_version_id)`,
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_model_generation_attempts_project_id ON model_generation_attempts(project_id)`,
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_model_generation_attempts_result_model_version_id ON model_generation_attempts(result_model_version_id)`,
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_model_subprocesses_model_version_id ON model_subprocesses(model_version_id)`,
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_model_subprocesses_subprocess_model_id ON model_subprocesses(subprocess_model_id)`,
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_model_subprocesses_model_version_task_id ON model_subprocesses(model_version_id, task_id)`,
  );

  // Unified timeline VIEW across version events and generation attempts
  db.exec(`
    CREATE VIEW IF NOT EXISTS model_activity_events AS
    SELECT
      'version_event'  AS source,
      id,
      model_version_id,
      type,
      NULL             AS generation_type,
      NULL             AS generation_input_mode,
      NULL             AS result,
      created_at
    FROM model_version_events
    UNION ALL
    SELECT
      'generation_attempt'                                   AS source,
      id,
      COALESCE(result_model_version_id, base_model_version_id) AS model_version_id,
      NULL                                                   AS type,
      generation_type,
      generation_input_mode,
      result,
      created_at
    FROM model_generation_attempts
  `);
}

initializeSchema();

export default db;

const db = require("../database");

class ModelRepository {
  getProjectIdByModelId(modelId) {
    const stmt = db.prepare(`
      SELECT d.projectId
      FROM models m
      JOIN documents d ON m.documentId = d.id
      WHERE m.id = ?
    `);
    const result = stmt.get(modelId);
    return result?.projectId ?? null;
  }

  getProjectIdByDocumentId(documentId) {
    const stmt = db.prepare(`
      SELECT projectId FROM documents WHERE id = ?
    `);
    const result = stmt.get(documentId);
    return result?.projectId ?? null;
  }

  create(id, name, timestamp, documentId, words) {
    const stmt = db.prepare(
      "INSERT INTO models (id, name, timestamp, documentId, status, regeneratedByPromptTimes, regeneratedBySelectionsTimes, words) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    );
    stmt.run(id, name, timestamp, documentId, "generated", 0, 0, words);
    return { id, name, timestamp, documentId, status: "generated", words };
  }

  findById(modelId) {
    const stmt = db.prepare(
      "SELECT * FROM models WHERE id = ? AND deleted_at IS NULL",
    );
    return stmt.get(modelId);
  }

  findAll() {
    const stmt = db.prepare("SELECT * FROM models ORDER BY timestamp DESC");
    return stmt.all();
  }

  updateStatus(modelId, status) {
    const stmt = db.prepare("UPDATE models SET status = ? WHERE id = ?");
    return stmt.run(status, modelId);
  }

  incrementRegeneratedByPrompt(modelId) {
    const stmt = db.prepare(
      "UPDATE models SET regeneratedByPromptTimes = regeneratedByPromptTimes + 1 WHERE id = ?",
    );
    return stmt.run(modelId);
  }

  incrementRegeneratedBySelections(modelId) {
    const stmt = db.prepare(
      "UPDATE models SET regeneratedBySelectionsTimes = regeneratedBySelectionsTimes + 1 WHERE id = ?",
    );
    return stmt.run(modelId);
  }

  softDelete(modelId) {
    const stmt = db.prepare("UPDATE models SET deleted_at = ? WHERE id = ?");
    return stmt.run(new Date().toISOString(), modelId);
  }

  addStatUpdate(modelId, timestamp, type, words) {
    const stmt = db.prepare(
      "INSERT INTO model_stat_updates (modelId, timestamp, type, words) VALUES (?, ?, ?, ?)",
    );
    return stmt.run(modelId, timestamp, type, words);
  }

  getStatUpdates(projectId) {
    const stmt = db.prepare(`
      SELECT msu.id, msu.modelId, msu.timestamp, msu.type, msu.words,
             m.name as modelName
      FROM model_stat_updates msu
      JOIN models m ON msu.modelId = m.id
      JOIN documents d ON m.documentId = d.id
      WHERE d.projectId = ?
      ORDER BY msu.timestamp DESC
    `);
    return stmt.all(projectId);
  }

  getModelsByProjectId(projectId) {
    const stmt = db.prepare(`
      SELECT m.id, m.name, m.timestamp, m.status, 
             m.regeneratedByPromptTimes, m.regeneratedBySelectionsTimes, 
             m.words, d.name as documentName
      FROM models m
      JOIN documents d ON m.documentId = d.id
      WHERE d.projectId = ? AND m.deleted_at IS NULL
      ORDER BY m.timestamp DESC
    `);
    return stmt.all(projectId);
  }
}

module.exports = new ModelRepository();

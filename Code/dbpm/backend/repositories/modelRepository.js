import db from "../database.js";
import { convertKeysToCamelCase } from "../utils/caseConverter.js";

class ModelRepository {
  getProjectIdByModelId(modelId) {
    const stmt = db.prepare(`
      SELECT d.project_id
      FROM models m
      JOIN documents d ON m.document_id = d.id
      WHERE m.id = ?
    `);
    const result = stmt.get(modelId);
    return result?.project_id ?? null;
  }

  getProjectIdByDocumentId(documentId) {
    const stmt = db.prepare(`
      SELECT project_id FROM documents WHERE id = ?
    `);
    const result = stmt.get(documentId);
    return result?.project_id ?? null;
  }

  create(id, name, timestamp, documentId, words) {
    const stmt = db.prepare(
      "INSERT INTO models (id, name, created_at, document_id, status, regenerated_by_prompt_times, regenerated_by_selections_times, words) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    );
    stmt.run(id, name, timestamp, documentId, "generated", 0, 0, words);
    return { id, name, timestamp, documentId, status: "generated", words };
  }

  findById(modelId) {
    const stmt = db.prepare(
      "SELECT * FROM models WHERE id = ? AND deleted_at IS NULL",
    );
    const result = stmt.get(modelId);
    return result ? convertKeysToCamelCase(result) : null;
  }

  findAll() {
    const stmt = db.prepare("SELECT * FROM models ORDER BY created_at DESC");
    const results = stmt.all();
    return convertKeysToCamelCase(results);
  }

  updateStatus(modelId, status) {
    const stmt = db.prepare("UPDATE models SET status = ? WHERE id = ?");
    return stmt.run(status, modelId);
  }

  incrementRegeneratedByPrompt(modelId) {
    const stmt = db.prepare(
      "UPDATE models SET regenerated_by_prompt_times = regenerated_by_prompt_times + 1 WHERE id = ?",
    );
    return stmt.run(modelId);
  }

  incrementRegeneratedBySelections(modelId) {
    const stmt = db.prepare(
      "UPDATE models SET regenerated_by_selections_times = regenerated_by_selections_times + 1 WHERE id = ?",
    );
    return stmt.run(modelId);
  }

  softDelete(modelId) {
    const stmt = db.prepare("UPDATE models SET deleted_at = ? WHERE id = ?");
    return stmt.run(new Date().toISOString(), modelId);
  }

  addStatUpdate(modelId, timestamp, type, words) {
    const stmt = db.prepare(
      "INSERT INTO model_stat_updates (model_id, created_at, type, words) VALUES (?, ?, ?, ?)",
    );
    return stmt.run(modelId, timestamp, type, words);
  }

  getStatUpdates(projectId) {
    const stmt = db.prepare(`
      SELECT msu.id, msu.model_id, msu.created_at, msu.type, msu.words,
             m.name as model_name
      FROM model_stat_updates msu
      JOIN models m ON msu.model_id = m.id
      JOIN documents d ON m.document_id = d.id
      WHERE d.project_id = ?
      ORDER BY msu.created_at DESC
    `);
    const results = stmt.all(projectId);
    return convertKeysToCamelCase(results);
  }

  getModelsByProjectId(projectId) {
    const stmt = db.prepare(`
      SELECT m.id, m.name, m.created_at, m.status, 
             m.regenerated_by_prompt_times, m.regenerated_by_selections_times, 
             m.words, d.name as document_name
      FROM models m
      JOIN documents d ON m.document_id = d.id
      WHERE d.project_id = ? AND m.deleted_at IS NULL
      ORDER BY m.created_at DESC
    `);
    const results = stmt.all(projectId);
    return convertKeysToCamelCase(results);
  }
}

export default new ModelRepository();

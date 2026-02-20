import { toCamel } from "snake-camel";
import db from "../../../database.js";

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

  create({ id, name, documentId, selectedTextWords }) {
    const stmt = db.prepare(`
    INSERT INTO models (id, name, document_id, selected_text_words)
    VALUES (@id, @name, @documentId, @selectedTextWords)
    RETURNING *
  `);
    const row = stmt.get({ id, name, documentId, selectedTextWords });
    return toCamel(row);
  }

  findById(modelId) {
    const stmt = db.prepare(
      "SELECT * FROM models WHERE id = ? AND deleted_at IS NULL",
    );
    const result = stmt.get(modelId);
    return result ? toCamel(result) : null;
  }

  findAll() {
    const stmt = db.prepare("SELECT * FROM models ORDER BY created_at DESC");
    const results = stmt.all();
    return results.map(toCamel);
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
    return results.map(toCamel);
  }
}

export default new ModelRepository();

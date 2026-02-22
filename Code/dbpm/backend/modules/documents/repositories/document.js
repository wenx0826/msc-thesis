import db from "../../../database.js";
import { toCamel, toSnake } from "snake-camel";

export default {
  create({ id, projectId }) {
    const stmt = db.prepare(`
    INSERT INTO documents (id, project_id)
    VALUES (@id, @projectId)
    RETURNING *
  `);
    const row = stmt.get({
      id,
      projectId,
    });
    return toCamel(row);
  },
  count(includeDeleted = false) {
    const stmt = db.prepare(
      `SELECT COUNT(*) as count FROM documents ${includeDeleted ? "" : "WHERE deleted_at IS NULL"}`,
    );
    const result = stmt.get();
    return result.count;
  },
  getAverageWordsCount(includeDeleted = false) {
    const stmt = db.prepare(`
      SELECT COALESCE(AVG(COALESCE(dv.words_count, 0)), 0) AS average_words_count
      FROM documents d
      LEFT JOIN document_versions dv ON d.latest_version_id = dv.id
      ${includeDeleted ? "" : "WHERE d.deleted_at IS NULL"}
    `);
    const result = stmt.get();
    return result.average_words_count;
  },
  findById(id) {
    const stmt = db.prepare(`
      SELECT d.*, dv.name
      FROM documents d 
      LEFT JOIN document_versions dv ON d.latest_version_id = dv.id 
      WHERE d.id = ?
    `);
    const result = stmt.get(id);
    return toCamel(result);
  },
  findByProjectId(projectId, includeDeleted = false) {
    const stmt = db.prepare(`
      SELECT *
      FROM documents 
      WHERE project_id = ? ${includeDeleted ? "" : "AND deleted_at IS NULL"}
      ORDER BY created_at ASC
    `);
    const results = stmt.all(projectId);
    return results.map(toCamel);
  },
  findProjectIdById(id) {
    const stmt = db.prepare("SELECT project_id FROM documents WHERE id = ?");
    const result = stmt.get(id);
    return result?.project_id ?? null;
  },
  getTraces(docId, includeDeleted = false) {
    const stmt = db.prepare(`
      SELECT
        t.id,
        dv.document_id,
        mv.model_id,
        t.selections,
        t.created_at,
        t.deleted_at
      FROM traces t
      JOIN document_versions dv ON dv.id = t.document_version_id
      JOIN model_versions mv ON mv.id = t.model_version_id
      WHERE dv.document_id = ?
      ${includeDeleted ? "" : "AND t.deleted_at IS NULL"}
      ORDER BY t.created_at ASC
    `);
    const results = stmt.all(docId);
    return results.map((trace) =>
      toCamel({
        ...trace,
        selections: trace.selections ? JSON.parse(trace.selections) : [],
      }),
    );
  },
  getModels(docId, includeDeleted = false) {
    const stmt = db.prepare(`
      SELECT DISTINCT m.*, lv.name
      FROM traces t
      JOIN document_versions dv ON dv.id = t.document_version_id
      JOIN model_versions mv ON mv.id = t.model_version_id
      JOIN models m ON m.id = mv.model_id
      LEFT JOIN model_versions lv ON lv.id = m.latest_version_id
      WHERE dv.document_id = ?
      ${includeDeleted ? "" : "AND m.deleted_at IS NULL"}
      ORDER BY m.created_at ASC
    `);
    const results = stmt.all(docId);
    return results.map(toCamel);
  },
  getAllModels(docId) {
    return this.getModels(docId, true);
  },
  update(id, updates) {
    const fields = [];
    const values = [];

    if (updates.latestVersionId !== undefined) {
      fields.push("latest_version_id = ?");
      values.push(updates.latestVersionId);
    }

    if (fields.length === 0) {
      return null;
    }
    values.push(id);
    const stmt = db.prepare(
      `UPDATE documents SET ${fields.join(", ")} WHERE id = ?`,
    );
    stmt.run(...values);
    return this.findById(id);
  },
  delete(id) {
    return this.softDelete(id);
  },
  softDelete(id) {
    const stmt = db.prepare("UPDATE documents SET deleted_at = ? WHERE id = ?");
    return stmt.run(new Date().toISOString(), id);
  },
};

import db from "../../../database.js";
import { toCamel, toSnake } from "snake-camel";

export default {
  create({ id, documentId, name, wordsCount }) {
    const stmt = db.prepare(`
    INSERT INTO document_versions (id, document_id, name, words_count)
    VALUES (@id, @documentId, @name, @wordsCount)
    RETURNING *
  `);
    const row = stmt.get({
      id,
      documentId,
      name,
      wordsCount,
    });
    return toCamel(row);
  },
  findAll() {
    const stmt = db.prepare(
      "SELECT id, name, created_at, project_id FROM documents",
    );
    const results = stmt.all();
    return results.map(toCamel);
  },
  findById(docId) {
    const stmt = db.prepare("SELECT * FROM documents WHERE id = ?");
    const result = stmt.get(docId);
    return toCamel(result);
  },
  findByDocumentId(documentId) {
    const stmt = db.prepare(
      "SELECT * FROM document_versions WHERE document_id = ? ORDER BY created_at ASC",
    );
    const results = stmt.all(documentId);
    return results.map(toCamel);
  },
  getTraces(docId) {
    const stmt = db.prepare("SELECT * FROM traces WHERE document_id = ?");
    const results = stmt.all(docId);
    const parsedTraces = results.map((trace) => ({
      ...trace,
      selections: trace.selections ? JSON.parse(trace.selections) : null,
    }));
    return parsedTraces.map(toCamel);
  },
  update(id, updates) {
    const fields = [];
    const values = [];

    if (updates.name !== undefined) {
      fields.push("name = ?");
      values.push(updates.name);
    }

    if (fields.length === 0) {
      return null;
    }

    values.push(id);
    const stmt = db.prepare(
      `UPDATE document_versions SET ${fields.join(", ")} WHERE id = ? RETURNING *`,
    );
    const result = stmt.get(...values);
    return toCamel(result);
  },

  softDelete(docId) {
    const stmt = db.prepare("UPDATE documents SET deleted_at = ? WHERE id = ?");
    return stmt.run(new Date().toISOString(), docId);
  },
};

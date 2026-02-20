import db from "../../database.js";
import { toCamel, toSnake } from "snake-camel";

class DocumentRepository {
  create({ versionId, documentId, projectId, name, storagePath, wordsCount }) {
    const stmt = db.prepare(`
    INSERT INTO documents (version_id, document_id, name, project_id, storage_path, words_count)
    VALUES (@versionId, @documentId, @name, @projectId, @storagePath, @wordsCount)
    RETURNING *
  `);
    const row = stmt.get({
      versionId,
      documentId,
      name,
      projectId,
      storagePath,
      wordsCount,
    });
    return toCamel(row);
  }
  findAll() {
    const stmt = db.prepare(
      "SELECT id, name, created_at, project_id FROM documents",
    );
    const results = stmt.all();
    return results.map(toCamel);
  }

  findById(docId) {
    const stmt = db.prepare("SELECT id FROM documents WHERE id = ?");
    const result = stmt.get(docId);
    return toCamel(result);
  }

  findByProjectId(projectId) {
    const stmt = db.prepare(
      "SELECT version_id, document_id, project_id, name FROM documents WHERE project_id = ?",
    );
    const results = stmt.all(projectId);
    return results.map(toCamel);
  }

  getProjectId(docId) {
    const stmt = db.prepare("SELECT project_id FROM documents WHERE id = ?");
    const result = stmt.get(docId);
    return result?.project_id;
  }
  // todo
  getTraces(docId) {
    const stmt = db.prepare("SELECT * FROM traces WHERE document_id = ?");
    const results = stmt.all(docId);
    const parsedTraces = results.map((trace) => ({
      ...trace,
      selections: trace.selections ? JSON.parse(trace.selections) : null,
    }));
    return parsedTraces.map(toCamel);
  }

  getModels(docId) {
    const stmt = db.prepare(`
      SELECT DISTINCT m.* FROM models m
      INNER JOIN traces t ON t.model_id = m.id
      WHERE t.document_id = ? AND m.deleted_at IS NULL
    `);
    const results = stmt.all(docId);
    return results.map(toCamel);
  }

  getAllModels(docId) {
    const stmt = db.prepare(`
      SELECT DISTINCT m.* FROM models m
      INNER JOIN traces t ON t.model_id = m.id
      WHERE t.document_id = ?
    `);
    const results = stmt.all(docId);
    return results.map(toCamel);
  }
  softDelete(docId) {
    const stmt = db.prepare("UPDATE documents SET deleted_at = ? WHERE id = ?");
    return stmt.run(new Date().toISOString(), docId);
  }
}

export default new DocumentRepository();

import db from "../database.js";
import { convertKeysToCamelCase } from "../utils/caseConverter.js";

class DocumentRepository {
  create(id, name, uploadedAt, projectId, words) {
    const stmt = db.prepare(
      "INSERT INTO documents (id, name, created_at, project_id, words) VALUES (?, ?, ?, ?, ?)",
    );
    stmt.run(id, name, uploadedAt, projectId, words);
    return { id, name, uploadedAt, projectId, words };
  }

  findAll() {
    const stmt = db.prepare(
      "SELECT id, name, created_at, project_id FROM documents",
    );
    const results = stmt.all();
    return convertKeysToCamelCase(results);
  }

  findById(docId) {
    const stmt = db.prepare("SELECT id FROM documents WHERE id = ?");
    const result = stmt.get(docId);
    return result ? convertKeysToCamelCase(result) : null;
  }

  findByProjectId(projectId) {
    const stmt = db.prepare(
      "SELECT id, name, created_at, project_id FROM documents WHERE project_id = ?",
    );
    const results = stmt.all(projectId);
    return convertKeysToCamelCase(results);
  }

  delete(docId) {
    const deleteStmt = db.prepare("DELETE FROM documents WHERE id = ?");
    return deleteStmt.run(docId);
  }

  getTraces(docId) {
    const stmt = db.prepare("SELECT * FROM traces WHERE document_id = ?");
    const results = stmt.all(docId);
    return convertKeysToCamelCase(results);
  }

  getModels(docId) {
    const stmt = db.prepare(`
      SELECT DISTINCT m.* FROM models m
      INNER JOIN traces t ON t.model_id = m.id
      WHERE t.document_id = ? AND m.deleted_at IS NULL
    `);
    const results = stmt.all(docId);
    return convertKeysToCamelCase(results);
  }

  getAllModels(docId) {
    const stmt = db.prepare(`
      SELECT DISTINCT m.* FROM models m
      INNER JOIN traces t ON t.model_id = m.id
      WHERE t.document_id = ?
    `);
    const results = stmt.all(docId);
    return convertKeysToCamelCase(results);
  }
}

export default new DocumentRepository();

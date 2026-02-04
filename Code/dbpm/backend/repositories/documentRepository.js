const db = require("../database");

class DocumentRepository {
  create(id, name, uploadedAt, projectId, words) {
    const stmt = db.prepare(
      "INSERT INTO documents (id, name, uploadedAt, projectId, words) VALUES (?, ?, ?, ?, ?)",
    );
    stmt.run(id, name, uploadedAt, projectId, words);
    return { id, name, uploadedAt, projectId, words };
  }

  findAll() {
    const stmt = db.prepare(
      "SELECT id, name, uploadedAt, projectId FROM documents",
    );
    return stmt.all();
  }

  findById(docId) {
    const stmt = db.prepare("SELECT id FROM documents WHERE id = ?");
    return stmt.get(docId);
  }

  findByProjectId(projectId) {
    const stmt = db.prepare(
      "SELECT id, name, uploadedAt, projectId FROM documents WHERE projectId = ?",
    );
    return stmt.all(projectId);
  }

  delete(docId) {
    const deleteStmt = db.prepare("DELETE FROM documents WHERE id = ?");
    return deleteStmt.run(docId);
  }

  getTraces(docId) {
    const stmt = db.prepare("SELECT * FROM traces WHERE documentId = ?");
    return stmt.all(docId);
  }

  getModels(docId) {
    const stmt = db.prepare(`
      SELECT DISTINCT m.* FROM models m
      INNER JOIN traces t ON t.modelId = m.id
      WHERE t.documentId = ? AND m.deleted_at IS NULL
    `);
    return stmt.all(docId);
  }

  getAllModels(docId) {
    const stmt = db.prepare(`
      SELECT DISTINCT m.* FROM models m
      INNER JOIN traces t ON t.modelId = m.id
      WHERE t.documentId = ?
    `);
    return stmt.all(docId);
  }
}

module.exports = new DocumentRepository();

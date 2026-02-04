const db = require("../database");

class ProjectRepository {
  create(projectId, name, createdAt) {
    const stmt = db.prepare(
      "INSERT INTO projects (id, name, createdAt, generatedModelNumber) VALUES (?, ?, ?, ?)",
    );
    stmt.run(projectId, name, createdAt, 0);
    return { id: projectId, name, createdAt, generatedModelNumber: 0 };
  }

  findAll() {
    const stmt = db.prepare("SELECT * FROM projects");
    return stmt.all();
  }

  findById(projectId) {
    const stmt = db.prepare("SELECT * FROM projects WHERE id = ?");
    return stmt.get(projectId);
  }

  update(projectId, updates) {
    const fields = [];
    const values = [];

    if (updates.name !== undefined) {
      fields.push("name = ?");
      values.push(updates.name);
    }
    if (updates.generatedModelNumber !== undefined) {
      fields.push("generatedModelNumber = ?");
      values.push(updates.generatedModelNumber);
    }

    if (fields.length === 0) {
      return null;
    }

    values.push(projectId);
    const stmt = db.prepare(
      `UPDATE projects SET ${fields.join(", ")} WHERE id = ?`,
    );
    const result = stmt.run(...values);

    if (result.changes === 0) {
      return null;
    }

    return this.findById(projectId);
  }

  getDocumentCount(projectId) {
    const stmt = db.prepare(
      "SELECT COUNT(*) as count FROM documents WHERE projectId = ?",
    );
    return stmt.get(projectId);
  }

  getModelCount(projectId) {
    const stmt = db.prepare(`
      SELECT COUNT(DISTINCT m.id) as count 
      FROM models m
      JOIN documents d ON m.documentId = d.id
      WHERE d.projectId = ? AND m.deleted_at IS NULL
    `);
    return stmt.get(projectId);
  }

  getTotalModelCount(projectId) {
    const stmt = db.prepare(`
      SELECT COUNT(DISTINCT m.id) as count 
      FROM models m
      JOIN documents d ON m.documentId = d.id
      WHERE d.projectId = ?
    `);
    return stmt.get(projectId);
  }

  getAllModelsByProjectId(projectId) {
    const stmt = db.prepare(`
      SELECT DISTINCT m.* FROM models m
      INNER JOIN documents d ON m.documentId = d.id
      WHERE d.projectId = ?
      ORDER BY m.timestamp DESC
    `);
    return stmt.all(projectId);
  }

  getStats(projectId) {
    const docsStmt = db.prepare(
      "SELECT COUNT(*) as count, SUM(words) as totalWords FROM documents WHERE projectId = ?",
    );
    const docStats = docsStmt.get(projectId);

    const modelsStmt = db.prepare(`
      SELECT COUNT(*) as count, SUM(m.words) as totalWords
      FROM models m
      JOIN documents d ON m.documentId = d.id
      WHERE d.projectId = ? AND m.deleted_at IS NULL
    `);
    const modelStats = modelsStmt.get(projectId);

    return {
      documentCount: docStats.count || 0,
      documentTotalWords: docStats.totalWords || 0,
      modelCount: modelStats.count || 0,
      modelTotalWords: modelStats.totalWords || 0,
    };
  }
}

module.exports = new ProjectRepository();

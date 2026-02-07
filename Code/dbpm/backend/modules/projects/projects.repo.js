import db from "../../database.js";
import {
  convertKeysToCamelCase,
  convertKeysToSnakeCase,
} from "../../utils/caseConverter.js";

class ProjectRepository {
  create({ id, name }) {
    const stmt = db.prepare(`
    INSERT INTO projects (id, name)
    VALUES (@id, @name)
    RETURNING *
  `);
    const row = stmt.get({ id, name });
    return convertKeysToCamelCase(row);
  }

  findAll() {
    const stmt = db.prepare("SELECT * FROM projects ORDER BY created_at DESC");
    const results = stmt.all();
    return convertKeysToCamelCase(results);
  }

  findById(projectId) {
    const stmt = db.prepare("SELECT * FROM projects WHERE id = ?");
    const result = stmt.get(projectId);
    return result ? convertKeysToCamelCase(result) : null;
  }

  update(projectId, updates) {
    const fields = [];
    const values = [];

    if (updates.name !== undefined) {
      fields.push("name = ?");
      values.push(updates.name);
    }
    if (updates.modelGenerationCounter !== undefined) {
      fields.push("model_generation_counter = ?");
      values.push(updates.modelGenerationCounter);
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
  getModelGenerationCounter(projectId) {
    const stmt = db.prepare(
      "SELECT model_generation_counter FROM projects WHERE id = ?",
    );
    return convertKeysToCamelCase(stmt.get(projectId));
  }
  getDocumentCount(projectId) {
    const stmt = db.prepare(
      "SELECT COUNT(*) as count FROM documents WHERE project_id = ?",
    );
    return stmt.get(projectId);
  }

  getModelCount(projectId) {
    const stmt = db.prepare(`
      SELECT COUNT(DISTINCT m.id) as count 
      FROM models m
      JOIN documents d ON m.document_id = d.id
      WHERE d.project_id = ? AND m.deleted_at IS NULL
    `);
    return stmt.get(projectId);
  }

  getTotalModelCount(projectId) {
    const stmt = db.prepare(`
      SELECT COUNT(DISTINCT m.id) as count 
      FROM models m
      JOIN documents d ON m.document_id = d.id
      WHERE d.project_id = ?
    `);
    return stmt.get(projectId);
  }

  getAllModelsByProjectId(projectId) {
    const stmt = db.prepare(`
      SELECT DISTINCT m.* FROM models m
      INNER JOIN documents d ON m.document_id = d.id
      WHERE d.project_id = ?
      ORDER BY m.timestamp DESC
    `);
    const results = stmt.all(projectId);
    return convertKeysToCamelCase(results);
  }

  getStats(projectId) {
    const docsStmt = db.prepare(
      "SELECT COUNT(*) as count, SUM(words) as totalWords FROM documents WHERE project_id = ?",
    );
    const docStats = docsStmt.get(projectId);

    const modelsStmt = db.prepare(`
      SELECT COUNT(*) as count, SUM(m.words) as totalWords
      FROM models m
      JOIN documents d ON m.document_id = d.id
      WHERE d.project_id = ? AND m.deleted_at IS NULL
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

export default new ProjectRepository();

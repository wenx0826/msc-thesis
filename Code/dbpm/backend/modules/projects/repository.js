import db from "../../database.js";
import { toCamel } from "snake-camel";

export default {
  create({ id, name }) {
    const stmt = db.prepare(`
    INSERT INTO projects (id, name)
    VALUES (@id, @name)
    RETURNING *
  `);
    const row = stmt.get({ id, name });
    return toCamel(row);
  },

  findById(id) {
    const stmt = db.prepare("SELECT * FROM projects WHERE id = ?");
    const result = stmt.get(id);
    return result ? toCamel(result) : null;
  },

  findAll() {
    const stmt = db.prepare(`
      SELECT
        p.*,
        COUNT(DISTINCT d.id) AS documents_count,
        COUNT(DISTINCT m.id) AS models_count
      FROM projects p
      LEFT JOIN documents d
        ON d.project_id = p.id AND d.deleted_at IS NULL
      LEFT JOIN models m
        ON m.project_id = p.id AND m.deleted_at IS NULL
      WHERE p.deleted_at IS NULL
      GROUP BY p.id
      ORDER BY p.created_at ASC
    `);
    const results = stmt.all();
    return results.map(toCamel);
  },

  update(id, updates) {
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

    values.push(id);
    const stmt = db.prepare(
      `UPDATE projects SET ${fields.join(", ")} WHERE id = ?`,
    );
    const result = stmt.run(...values);

    if (result.changes === 0) {
      return null;
    }

    return this.findById(id);
  },
  findModelGenerationIndexById(id) {
    const stmt = db.prepare(
      "SELECT model_generation_counter FROM projects WHERE id = ?",
    );
    return toCamel(stmt.get(id));
  },
  getDocumentCount(id) {
    const stmt = db.prepare(
      "SELECT COUNT(*) as count FROM documents WHERE project_id = ?",
    );
    return stmt.get(id);
  },

  getModelCount(id) {
    const stmt = db.prepare(`
      SELECT COUNT(DISTINCT m.id) as count 
      FROM models m
      JOIN documents d ON m.document_id = d.id
      WHERE d.project_id = ? AND m.deleted_at IS NULL
    `);
    return stmt.get(id);
  },

  getTotalModelCount(id) {
    const stmt = db.prepare(`
      SELECT COUNT(DISTINCT m.id) as count 
      FROM models m
      JOIN documents d ON m.document_id = d.id
      WHERE d.project_id = ?
    `);
    return stmt.get(id);
  },

  getAllModelsByid(id) {
    const stmt = db.prepare(`
      SELECT DISTINCT m.* FROM models m
      INNER JOIN documents d ON m.document_id = d.id
      WHERE d.project_id = ?
      ORDER BY m.timestamp DESC
    `);
    const results = stmt.all(id);
    return results.map(toCamel);
  },

  getStats(id) {
    const docsStmt = db.prepare(
      "SELECT COUNT(*) as count, SUM(words) as totalWords FROM documents WHERE project_id = ?",
    );
    const docStats = docsStmt.get(id);

    const modelsStmt = db.prepare(`
      SELECT COUNT(*) as count, SUM(m.words) as totalWords
      FROM models m
      JOIN documents d ON m.document_id = d.id
      WHERE d.project_id = ? AND m.deleted_at IS NULL
    `);
    const modelStats = modelsStmt.get(id);

    return {
      documentCount: docStats.count || 0,
      documentTotalWords: docStats.totalWords || 0,
      modelCount: modelStats.count || 0,
      modelTotalWords: modelStats.totalWords || 0,
    };
  },
};

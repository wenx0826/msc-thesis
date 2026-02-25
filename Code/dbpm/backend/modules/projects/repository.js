import db from "../../database.js";
import { toCamel } from "snake-camel";
import BaseSqlRepository from "../shared/repositories/BaseSqlRepository.js";

class ProjectsRepository extends BaseSqlRepository {
  constructor() {
    super({
      db,
      tableName: "projects",
      requiredCreateColumns: ["name"],
    });
  }

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
  }

  count(includeDeleted = false) {
    const stmt = db.prepare(
      `SELECT COUNT(*) as count FROM projects ${includeDeleted ? "" : "WHERE deleted_at IS NULL"}`,
    );
    const result = stmt.get();
    return result.count;
  }

  allocateLatestModelNumberById(id) {
    const stmt = db.prepare(`
      UPDATE projects
      SET latest_model_number = latest_model_number + 1
      WHERE id = ?
      RETURNING latest_model_number
    `);
    const result = stmt.get(id);
    return result?.latest_model_number ?? null;
  }

  getDocumentCount(id) {
    const stmt = db.prepare(
      "SELECT COUNT(*) as count FROM documents WHERE project_id = ?",
    );
    return stmt.get(id);
  }

  getModelCount(id) {
    const stmt = db.prepare(`
      SELECT COUNT(DISTINCT m.id) as count 
      FROM models m
      JOIN documents d ON m.document_id = d.id
      WHERE d.project_id = ? AND m.deleted_at IS NULL
    `);
    return stmt.get(id);
  }

  getTotalModelCount(id) {
    const stmt = db.prepare(`
      SELECT COUNT(DISTINCT m.id) as count 
      FROM models m
      JOIN documents d ON m.document_id = d.id
      WHERE d.project_id = ?
    `);
    return stmt.get(id);
  }

  getAllModelsByid(id) {
    const stmt = db.prepare(`
      SELECT DISTINCT m.* FROM models m
      INNER JOIN documents d ON m.document_id = d.id
      WHERE d.project_id = ?
      ORDER BY m.timestamp DESC
    `);
    const results = stmt.all(id);
    return results.map(toCamel);
  }

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
  }
}

export default new ProjectsRepository();

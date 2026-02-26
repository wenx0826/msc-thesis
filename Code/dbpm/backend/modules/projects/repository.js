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
}

export default new ProjectsRepository();

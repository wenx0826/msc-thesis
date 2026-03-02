import db from "../../../database.js";
import BaseSqlRepository from "../../shared/repositories/BaseSqlRepository.js";

class ModelUpdateEventRepository extends BaseSqlRepository {
  constructor() {
    super({
      db,
      tableName: "model_update_events",
      requiredCreateColumns: ["model_version_id", "type"],
      jsonColumns: ["details"],
    });
  }

  add({ modelVersionId, type, details = null }) {
    return this.create({ modelVersionId, type, details });
  }

  countByTypeByProjectId(projectId, includeDeleted = true) {
    const stmt = db.prepare(`
      SELECT mue.type AS type, COUNT(*) AS count
      FROM model_update_events mue
      JOIN model_versions mv ON mv.id = mue.model_version_id
      JOIN models m ON m.id = mv.model_id
      WHERE m.project_id = ?
      ${includeDeleted ? "" : "AND m.deleted_at IS NULL"}
      GROUP BY mue.type
      ORDER BY count DESC, mue.type ASC
    `);

    return stmt.all(projectId).map((row) => ({
      type: row.type,
      count: Number(row.count) || 0,
    }));
  }

  countByTypeByProjectModelId(projectId, includeDeleted = true) {
    const stmt = db.prepare(`
      SELECT
        m.id AS model_id,
        m.name AS model_name,
        m.deleted_at AS model_deleted_at,
        mue.type AS type,
        COUNT(*) AS count
      FROM model_update_events mue
      JOIN model_versions mv ON mv.id = mue.model_version_id
      JOIN models m ON m.id = mv.model_id
      WHERE m.project_id = ?
      ${includeDeleted ? "" : "AND m.deleted_at IS NULL"}
      GROUP BY m.id, m.name, m.deleted_at, mue.type
      ORDER BY m.created_at ASC, count DESC, mue.type ASC
    `);

    return stmt.all(projectId).map((row) => ({
      modelId: row.model_id,
      modelName: row.model_name,
      modelDeletedAt: row.model_deleted_at ?? null,
      type: row.type,
      count: Number(row.count) || 0,
    }));
  }

  countByTypeByProjectModelVersionLevel(projectId, includeDeleted = true) {
    const stmt = db.prepare(`
      SELECT
        m.id AS model_id,
        m.name AS model_name,
        m.deleted_at AS model_deleted_at,
        mv.version_number AS version_number,
        mue.type AS type,
        COUNT(*) AS count
      FROM model_update_events mue
      JOIN model_versions mv ON mv.id = mue.model_version_id
      JOIN models m ON m.id = mv.model_id
      WHERE m.project_id = ?
      ${includeDeleted ? "" : "AND m.deleted_at IS NULL"}
      GROUP BY m.id, m.name, m.deleted_at, mv.version_number, mue.type
      ORDER BY m.created_at ASC, mv.version_number ASC, count DESC, mue.type ASC
    `);

    return stmt.all(projectId).map((row) => ({
      modelId: row.model_id,
      modelName: row.model_name,
      modelDeletedAt: row.model_deleted_at ?? null,
      versionNumber: Number(row.version_number) || 0,
      type: row.type,
      count: Number(row.count) || 0,
    }));
  }
}

export default new ModelUpdateEventRepository();

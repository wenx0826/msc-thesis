import db from "../../../database.js";
import BaseSqlRepository from "../../shared/repositories/BaseSqlRepository.js";

class ModelVersionEventRepository extends BaseSqlRepository {
  constructor() {
    super({
      db,
      tableName: "model_version_events",
      requiredCreateColumns: ["model_version_id", "type"],
    });
  }

  add({ modelVersionId, type, selectedWordsCount = null }) {
    return this.create({ modelVersionId, type, selectedWordsCount });
  }

  countByTypeByProjectId(projectId, includeDeleted = true) {
    const stmt = db.prepare(`
      SELECT mve.type AS type, COUNT(*) AS count
      FROM model_version_events mve
      JOIN model_versions mv ON mv.id = mve.model_version_id
      JOIN models m ON m.id = mv.model_id
      WHERE m.project_id = ?
      ${includeDeleted ? "" : "AND m.deleted_at IS NULL"}
      GROUP BY mve.type
      ORDER BY count DESC, mve.type ASC
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
        mve.type AS type,
        COUNT(*) AS count
      FROM model_version_events mve
      JOIN model_versions mv ON mv.id = mve.model_version_id
      JOIN models m ON m.id = mv.model_id
      WHERE m.project_id = ?
      ${includeDeleted ? "" : "AND m.deleted_at IS NULL"}
      GROUP BY m.id, m.name, m.deleted_at, mve.type
      ORDER BY m.created_at ASC, count DESC, mve.type ASC
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
        mve.type AS type,
        COUNT(*) AS count
      FROM model_version_events mve
      JOIN model_versions mv ON mv.id = mve.model_version_id
      JOIN models m ON m.id = mv.model_id
      WHERE m.project_id = ?
      ${includeDeleted ? "" : "AND m.deleted_at IS NULL"}
      GROUP BY m.id, m.name, m.deleted_at, mv.version_number, mve.type
      ORDER BY m.created_at ASC, mv.version_number ASC, count DESC, mve.type ASC
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

export default new ModelVersionEventRepository();

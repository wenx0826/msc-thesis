import crypto from "crypto";
import db from "../../../database.js";
import BaseSqlRepository from "../../shared/repositories/BaseSqlRepository.js";

class ModelSubprocessRepository extends BaseSqlRepository {
  constructor() {
    super({
      db,
      tableName: "model_subprocesses",
      requiredCreateColumns: [
        "model_version_id",
        "task_id",
        "subprocess_model_id",
      ],
      generatedColumns: {
        id: () => crypto.randomUUID(),
      },
      nonUpdatableColumns: ["id", "created_at", "model_version_id", "task_id"],
    });
  }

  findByModelVersionAndTask(modelVersionId, taskId) {
    const stmt = db.prepare(`
      SELECT *
      FROM model_subprocesses
      WHERE model_version_id = ? AND task_id = ?
      ORDER BY (deleted_at IS NOT NULL) ASC, created_at DESC, rowid DESC
      LIMIT 1
    `);
    const row = stmt.get(modelVersionId, taskId);
    return this.mapRow(row);
  }

  upsertActive({ modelVersionId, taskId, subprocessModelId }) {
    const existing = this.findByModelVersionAndTask(modelVersionId, taskId);
    if (existing?.id) {
      return this.updateById(existing.id, {
        subprocessModelId,
        deletedAt: null,
      });
    }

    return this.create({
      modelVersionId,
      taskId,
      subprocessModelId,
    });
  }

  softDeleteByModelVersionAndTask(modelVersionId, taskId) {
    const existing = this.findByModelVersionAndTask(modelVersionId, taskId);
    if (!existing?.id || existing.deletedAt) {
      return null;
    }
    return this.updateById(existing.id, {
      deletedAt: new Date().toISOString(),
    });
  }

  findLatestByProjectId(projectId, includeDeleted = false) {
    const stmt = db.prepare(`
      SELECT
        ms.model_version_id,
        mv.model_id AS model_id,
        ms.task_id,
        ms.subprocess_model_id
      FROM model_subprocesses ms
      JOIN model_versions mv ON mv.id = ms.model_version_id
      JOIN models source_model ON source_model.id = mv.model_id
      JOIN models subprocess_model ON subprocess_model.id = ms.subprocess_model_id
      WHERE source_model.project_id = ?
        AND source_model.latest_version_id = ms.model_version_id
        AND ms.deleted_at IS NULL
        ${includeDeleted ? "" : "AND source_model.deleted_at IS NULL AND subprocess_model.deleted_at IS NULL"}
      ORDER BY source_model.created_at ASC, ms.created_at ASC
    `);
    const rows = stmt.all(projectId);
    return rows.map((row) => this.mapRow(row));
  }
}

export default new ModelSubprocessRepository();

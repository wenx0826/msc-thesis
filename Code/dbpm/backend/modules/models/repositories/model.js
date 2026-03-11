import { toCamel } from "snake-camel";
import db from "../../../database.js";
import BaseSqlRepository from "../../shared/repositories/BaseSqlRepository.js";

function mapProjectModelRow(row) {
  const model = toCamel(row);
  return {
    ...model,
    documentId: typeof model.documentId === "string" ? model.documentId : "",
  };
}

class ModelRepository extends BaseSqlRepository {
  constructor() {
    super({
      db,
      tableName: "models",
      requiredCreateColumns: ["project_id", "name"],
    });
  }

  count(includeDeleted = false) {
    const stmt = db.prepare(
      `SELECT COUNT(*) AS count FROM models ${includeDeleted ? "" : "WHERE deleted_at IS NULL"}`,
    );
    const result = stmt.get();
    return result.count;
  }

  getAverageSelectedWordsCount(includeDeleted = false) {
    const stmt = db.prepare(`
      SELECT COALESCE(AVG(COALESCE(mv.selected_words_count, 0)), 0) AS average_selected_words_count
      FROM models m
      LEFT JOIN model_versions mv ON m.latest_version_id = mv.id
      ${includeDeleted ? "" : "WHERE m.deleted_at IS NULL"}
    `);
    const result = stmt.get();
    return result.average_selected_words_count;
  }

  getAverageVersionsCount(includeDeleted = false) {
    const stmt = db.prepare(`
      SELECT COALESCE(AVG(COALESCE(m.latest_version_number, 0)), 0) AS average_versions_count
      FROM models m
      ${includeDeleted ? "" : "WHERE m.deleted_at IS NULL"}
    `);
    const result = stmt.get();
    return result.average_versions_count;
  }

  getProjectIdByModelId(modelId) {
    const stmt = db.prepare("SELECT project_id FROM models WHERE id = ?");
    const result = stmt.get(modelId);
    return result?.project_id ?? null;
  }

  allocateLatestVersionNumber(modelId) {
    const stmt = db.prepare(`
      UPDATE models
      SET latest_version_number = latest_version_number + 1
      WHERE id = ?
      RETURNING latest_version_number
    `);
    const result = stmt.get(modelId);
    return result?.latest_version_number ?? null;
  }

  findById(modelId, includeDeleted = false) {
    const stmt = db.prepare(`
      SELECT
        m.*,
        (
          SELECT dv.document_id
          FROM document_model_links l
          JOIN document_versions dv ON dv.id = l.document_version_id
          WHERE l.model_version_id = m.latest_version_id
          ORDER BY dv.version_number DESC, l.created_at DESC
          LIMIT 1
        ) AS document_id
      FROM models m
      WHERE m.id = ? ${includeDeleted ? "" : "AND m.deleted_at IS NULL"}
    `);
    const result = stmt.get(modelId);
    return result ? mapProjectModelRow(result) : null;
  }

  findByProjectId(projectId, includeDeleted = false) {
    const stmt = db.prepare(`
      SELECT
        m.*,
        (
          SELECT dv.document_id
          FROM document_model_links l
          JOIN document_versions dv ON dv.id = l.document_version_id
          WHERE l.model_version_id = m.latest_version_id
          ORDER BY dv.version_number DESC, l.created_at DESC
          LIMIT 1
        ) AS document_id
      FROM models m
      WHERE m.project_id = ? ${includeDeleted ? "" : "AND m.deleted_at IS NULL"}
      ORDER BY m.created_at ASC
    `);
    const results = stmt.all(projectId);
    return results.map(mapProjectModelRow);
  }

  findIdsByDocumentId(documentId, includeDeleted = false) {
    const stmt = db.prepare(`
      SELECT DISTINCT m.id
      FROM models m
      JOIN model_versions mv ON mv.model_id = m.id
      JOIN document_model_links l ON l.model_version_id = mv.id
      JOIN document_versions dv ON dv.id = l.document_version_id
      WHERE dv.document_id = ? ${includeDeleted ? "" : "AND m.deleted_at IS NULL"}
      ORDER BY m.created_at ASC
    `);
    const rows = stmt.all(documentId);
    return rows.map((row) => row.id).filter(Boolean);
  }

  findVersionsByModelIds(modelIds) {
    if (!Array.isArray(modelIds) || modelIds.length === 0) {
      return new Map();
    }

    const placeholders = modelIds.map(() => "?").join(", ");
    const stmt = db.prepare(`
      SELECT *
      FROM model_versions
      WHERE model_id IN (${placeholders})
      ORDER BY model_id ASC, version_number ASC
    `);
    const versions = stmt.all(...modelIds).map(toCamel);
    const versionsByModelId = new Map();

    for (const version of versions) {
      const existing = versionsByModelId.get(version.modelId);
      if (existing) {
        existing.push(version);
      } else {
        versionsByModelId.set(version.modelId, [version]);
      }
    }

    return versionsByModelId;
  }

  attachVersions(models) {
    if (!Array.isArray(models) || models.length === 0) {
      return models ?? [];
    }

    const modelIds = models.map((model) => model.id);
    const versionsByModelId = this.findVersionsByModelIds(modelIds);

    for (const model of models) {
      model.versions = versionsByModelId.get(model.id) ?? [];
    }

    return models;
  }

  findByProjectIdWithVersions(projectId, includeDeleted = false) {
    const models = this.findByProjectId(projectId, includeDeleted);
    return this.attachVersions(models);
  }

  findByIdWithVersions(modelId, includeDeleted = false) {
    const model = this.findById(modelId, includeDeleted);
    if (!model) {
      return null;
    }
    const [modelWithVersions] = this.attachVersions([model]);
    return modelWithVersions;
  }

  softDelete(modelId) {
    const stmt = db.prepare(`
      UPDATE models
      SET deleted_at = ?
      WHERE id = ? AND deleted_at IS NULL
    `);
    return stmt.run(new Date().toISOString(), modelId);
  }

  restore(modelId) {
    const stmt = db.prepare(`
      UPDATE models
      SET deleted_at = NULL
      WHERE id = ? AND deleted_at IS NOT NULL
    `);
    return stmt.run(modelId);
  }

}

export default new ModelRepository();

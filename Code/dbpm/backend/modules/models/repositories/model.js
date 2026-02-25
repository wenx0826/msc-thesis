import { toCamel } from "snake-camel";
import db from "../../../database.js";
import BaseSqlRepository from "../../shared/repositories/BaseSqlRepository.js";

function parseDocumentVersionIds(model) {
  if (typeof model.documentId !== "string") {
    model.documentId = "";
  }

  if (Array.isArray(model.documentVersionIds)) {
    model.documentVersionIds = model.documentVersionIds.filter(
      (id) => typeof id === "string",
    );
    return model;
  }

  if (typeof model.documentVersionIds !== "string") {
    model.documentVersionIds = [];
    return model;
  }

  try {
    const parsed = JSON.parse(model.documentVersionIds);
    model.documentVersionIds = Array.isArray(parsed)
      ? parsed.filter((id) => typeof id === "string")
      : [];
  } catch {
    model.documentVersionIds = [];
  }

  return model;
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

  findById(modelId) {
    const stmt = db.prepare(`SELECT * FROM models WHERE id = ?`);
    const result = stmt.get(modelId);
    return result ? toCamel(result) : null;
  }

  findByProjectId(projectId, includeDeleted = false) {
    const stmt = db.prepare(`
      SELECT
        m.*,
        (
          SELECT dv.document_id
          FROM traces t
          JOIN document_versions dv ON dv.id = t.document_version_id
          WHERE t.model_version_id = m.latest_version_id
          ORDER BY t.created_at DESC
          LIMIT 1
        ) AS document_id,
        COALESCE(
          (
            SELECT json_group_array(doc_version_id)
            FROM (
              SELECT DISTINCT t.document_version_id AS doc_version_id
              FROM traces t
              WHERE t.model_version_id = m.latest_version_id
            )
          ),
          '[]'
        ) AS document_version_ids
      FROM models m
      WHERE m.project_id = ? ${includeDeleted ? "" : "AND m.deleted_at IS NULL"}
      ORDER BY m.created_at ASC
    `);
    const results = stmt.all(projectId);
    return results.map((row) => parseDocumentVersionIds(toCamel(row)));
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

  findByIdWithVersions(modelId) {
    const model = this.findById(modelId);
    if (!model) {
      return null;
    }

    return this.attachVersions([model])[0];
  }

  findByProjectIdWithVersions(projectId, includeDeleted = false) {
    const models = this.findByProjectId(projectId, includeDeleted);
    return this.attachVersions(models);
  }

  incrementRegeneratedByPrompt(modelId) {
    const stmt = db.prepare(
      "UPDATE models SET regenerated_by_prompt_times = regenerated_by_prompt_times + 1 WHERE id = ?",
    );
    return stmt.run(modelId);
  }

  incrementRegeneratedBySelections(modelId) {
    const stmt = db.prepare(
      "UPDATE models SET regenerated_by_selections_times = regenerated_by_selections_times + 1 WHERE id = ?",
    );
    return stmt.run(modelId);
  }

  softDelete(modelId) {
    const stmt = db.prepare("UPDATE models SET deleted_at = ? WHERE id = ?");
    return stmt.run(new Date().toISOString(), modelId);
  }

  addStatUpdate(modelId, timestamp, type, words) {
    const stmt = db.prepare(
      "INSERT INTO model_stat_updates (model_id, created_at, type, words) VALUES (?, ?, ?, ?)",
    );
    return stmt.run(modelId, timestamp, type, words);
  }

  getStatUpdates(projectId) {
    const stmt = db.prepare(`
      SELECT msu.id, msu.model_id, msu.created_at, msu.type, msu.words,
             m.name as model_name
      FROM model_stat_updates msu
      JOIN models m ON msu.model_id = m.id
      JOIN documents d ON m.document_id = d.id
      WHERE d.project_id = ?
      ORDER BY msu.created_at DESC
    `);
    const results = stmt.all(projectId);
    return results.map(toCamel);
  }
}

export default new ModelRepository();

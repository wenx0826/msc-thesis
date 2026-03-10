import crypto from "crypto";
import db from "../../database.js";
import BaseSqlRepository from "../shared/repositories/BaseSqlRepository.js";

class TracesRepository extends BaseSqlRepository {
  constructor() {
    super({
      db,
      tableName: "document_model_links",
      requiredCreateColumns: [
        "document_version_id",
        "model_version_id",
        "selections",
      ],
      generatedColumns: {
        id: () => crypto.randomUUID(),
      },
      jsonColumns: ["selections"],
      nonUpdatableColumns: ["id", "created_at"],
    });
  }

  deserializeRow(row) {
    if (!row?.selections || typeof row.selections !== "string") {
      return row;
    }
    return {
      ...row,
      selections: JSON.parse(row.selections),
    };
  }

  findById(id) {
    const stmt = db.prepare(`
      SELECT t.*, mv.model_id, m.name AS model_name, dv.document_id
      FROM document_model_links t
      LEFT JOIN model_versions mv ON t.model_version_id = mv.id
      LEFT JOIN models m ON mv.model_id = m.id
      LEFT JOIN document_versions dv ON t.document_version_id = dv.id
      WHERE t.id = ?
    `);
    const row = stmt.get(id);
    return this.mapRow(row);
  }

  findLatestByDocumentVersionId(
    documentVersionId,
    includeDeletedModels = false,
  ) {
    const stmt = db.prepare(`
      WITH ranked_traces AS (
        SELECT
          t.*,
          mv.model_id,
          m.name AS model_name,
          dv.document_id,
          ROW_NUMBER() OVER (
            PARTITION BY mv.model_id
            ORDER BY mv.version_number DESC, t.created_at DESC, t.id DESC
          ) AS rank_in_model
        FROM document_model_links t
        LEFT JOIN model_versions mv ON t.model_version_id = mv.id
        LEFT JOIN models m ON mv.model_id = m.id
        LEFT JOIN document_versions dv ON t.document_version_id = dv.id
        WHERE t.document_version_id = ?
        ${includeDeletedModels ? "" : "AND m.deleted_at IS NULL"}
      )
      SELECT id, document_version_id, model_version_id, selections,
             created_at, model_id, model_name, document_id
      FROM ranked_traces
      WHERE rank_in_model = 1
      ORDER BY created_at ASC
    `);
    const rows = stmt.all(documentVersionId);
    return rows.map((row) => this.mapRow(row));
  }

  findLatestByModelVersionId(modelVersionId) {
    const stmt = db.prepare(`
      SELECT t.*, mv.model_id, m.name AS model_name, dv.document_id
      FROM document_model_links t
      LEFT JOIN model_versions mv ON t.model_version_id = mv.id
      LEFT JOIN models m ON mv.model_id = m.id
      LEFT JOIN document_versions dv ON t.document_version_id = dv.id
      WHERE t.model_version_id = ?
      ORDER BY dv.version_number DESC, t.created_at DESC
      LIMIT 1
    `);
    const row = stmt.get(modelVersionId);
    return this.mapRow(row);
  }

  updateByModelId(modelVersionId, selections) {
    const stmt = db.prepare(
      "UPDATE document_model_links SET selections = ? WHERE model_version_id = ?",
    );
    return stmt.run(JSON.stringify(selections), modelVersionId);
  }
}

export default new TracesRepository();

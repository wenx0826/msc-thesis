import crypto from "crypto";
import db from "../../database.js";
import BaseSqlRepository from "../shared/repositories/BaseSqlRepository.js";

class TracesRepository extends BaseSqlRepository {
  constructor() {
    super({
      db,
      tableName: "traces",
      requiredCreateColumns: [
        "document_version_id",
        "model_version_id",
        "selections",
      ],
      generatedColumns: {
        id: () => crypto.randomUUID(),
        trace_id: () => crypto.randomUUID(),
      },
      jsonColumns: ["selections"],
      nonUpdatableColumns: ["id", "trace_id", "created_at"],
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
      SELECT t.*, mv.model_id
      FROM traces t
      LEFT JOIN model_versions mv ON t.model_version_id = mv.id
      WHERE t.id = ?
    `);
    const row = stmt.get(id);
    return this.mapRow(row);
  }

  findByDocumentVersionId(documentVersionId) {
    const stmt = db.prepare(`
      SELECT t.*, mv.model_id
      FROM traces t
      LEFT JOIN model_versions mv ON t.model_version_id = mv.id
      WHERE t.document_version_id = ?
    `);
    const rows = stmt.all(documentVersionId);
    return rows.map((row) => this.mapRow(row));
  }

  findLatestByModelVersionId(modelVersionId) {
    const stmt = db.prepare(`
      SELECT *
      FROM traces
      WHERE model_version_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `);
    const row = stmt.get(modelVersionId);
    return this.mapRow(row);
  }

  updateByModelId(modelVersionId, selections) {
    const stmt = db.prepare(
      "UPDATE traces SET selections = ? WHERE model_version_id = ?",
    );
    return stmt.run(JSON.stringify(selections), modelVersionId);
  }
}

export default new TracesRepository();

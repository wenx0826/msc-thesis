import db from "../../database.js";

import { toCamel, toSnake } from "snake-camel";

function parseTraceSelections(trace) {
  if (!trace.selections) {
    return trace;
  }
  return {
    ...trace,
    selections: JSON.parse(trace.selections),
  };
}

export default {
  create({ id, documentVersionId, modelVersionId, selections }) {
    const stmt = db.prepare(`
      INSERT INTO traces (id, document_version_id, model_version_id, selections)
      VALUES (@id, @documentVersionId, @modelVersionId, @selections)
      RETURNING *`);
    const row = stmt.get({
      id,
      documentVersionId,
      modelVersionId,
      selections: JSON.stringify(selections),
    });
    return toCamel(parseTraceSelections(row));
  },
  findByDocumentVersionId(documentVersionId) {
    const stmt = db.prepare(`
      SELECT t.*, mv.model_id FROM traces t
      LEFT JOIN model_versions mv ON t.model_version_id = mv.id
      WHERE t.document_version_id = ? AND t.deleted_at IS NULL`);
    const rows = stmt.all(documentVersionId);
    return rows.map((row) => toCamel(parseTraceSelections(row)));
  },
  update(traceId, documentVersionId, modelVersionId, selections) {
    const stmt = db.prepare(
      "UPDATE traces SET document_version_id = ?, model_version_id = ?, selections = ? WHERE id = ?",
    );
    const result = stmt.run(
      documentVersionId,
      modelVersionId,
      JSON.stringify(selections),
      traceId,
    );
    return result.changes > 0;
  },

  updateByModelId(modelVersionId, selections) {
    const stmt = db.prepare(
      "UPDATE traces SET selections = ? WHERE model_version_id = ?",
    );
    return stmt.run(JSON.stringify(selections), modelVersionId);
  },
};

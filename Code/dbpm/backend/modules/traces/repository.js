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
  create({ id, documentId, modelId, selections }) {
    const stmt = db.prepare(
      `INSERT INTO traces (id, document_id, model_id, selections)
       VALUES (@id, @documentId, @modelId, @selections)
        RETURNING *`,
    );
    const row = stmt.get({
      id,
      documentId,
      modelId,
      selections: JSON.stringify(selections),
    });
    return toCamel(parseTraceSelections(row));
  },

  update(traceId, documentId, modelId, selections) {
    const stmt = db.prepare(
      "UPDATE traces SET document_id = ?, model_id = ?, selections = ? WHERE id = ?",
    );
    const result = stmt.run(
      documentId,
      modelId,
      JSON.stringify(selections),
      traceId,
    );
    return result.changes > 0;
  },

  updateByModelId(modelId, selections) {
    const stmt = db.prepare(
      "UPDATE traces SET selections = ? WHERE model_id = ?",
    );
    return stmt.run(JSON.stringify(selections), modelId);
  },
};

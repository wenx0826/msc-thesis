import db from "../database.js";

class TraceRepository {
  create(id, documentId, modelId, prompt, selections, timestamp) {
    const stmt = db.prepare(
      "INSERT INTO traces (id, document_id, model_id, selections, created_at) VALUES (?, ?, ?, ?, ?)",
    );
    stmt.run(id, documentId, modelId, JSON.stringify(selections), timestamp);
    return { id, documentId, modelId, selections, timestamp };
  }

  update(traceId, documentId, modelId, prompt, selections) {
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
  }

  updateByModelId(modelId, prompt, selections) {
    const stmt = db.prepare(
      "UPDATE traces SET selections = ? WHERE model_id = ?",
    );
    return stmt.run(JSON.stringify(selections), modelId);
  }
}

export default new TraceRepository();

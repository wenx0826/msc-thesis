const db = require("../database");

class TraceRepository {
  create(id, documentId, modelId, prompt, selections, timestamp) {
    const stmt = db.prepare(
      "INSERT INTO traces (id, documentId, modelId, prompt, selections, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
    );
    stmt.run(
      id,
      documentId,
      modelId,
      prompt || null,
      JSON.stringify(selections),
      timestamp,
    );
    return { id, documentId, modelId, prompt, selections, timestamp };
  }

  update(traceId, documentId, modelId, prompt, selections) {
    const stmt = db.prepare(
      "UPDATE traces SET documentId = ?, modelId = ?, prompt = ?, selections = ? WHERE id = ?",
    );
    const result = stmt.run(
      documentId,
      modelId,
      prompt || null,
      JSON.stringify(selections),
      traceId,
    );
    return result.changes > 0;
  }

  updateByModelId(modelId, prompt, selections) {
    const stmt = db.prepare(
      "UPDATE traces SET prompt = ?, selections = ? WHERE modelId = ?",
    );
    return stmt.run(prompt || null, JSON.stringify(selections), modelId);
  }
}

module.exports = new TraceRepository();

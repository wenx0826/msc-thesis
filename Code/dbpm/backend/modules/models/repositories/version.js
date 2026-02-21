import db from "../../../database.js";
import { toCamel, toSnake } from "snake-camel";

export default {
  create({ id, modelId, name, selectedWordsCount }) {
    const stmt = db.prepare(`
    INSERT INTO model_versions (id, model_id, name, selected_words_count)
    VALUES (@id, @modelId, @name, @selectedWordsCount)
    RETURNING *
  `);
    const row = stmt.get({
      id,
      modelId,
      name,
      selectedWordsCount,
    });
    return toCamel(row);
  },
  findAll() {
    const stmt = db.prepare(
      "SELECT id, name, created_at, project_id FROM models",
    );
    const results = stmt.all();
    return results.map(toCamel);
  },

  findById(modelId) {
    const stmt = db.prepare("SELECT * FROM models WHERE id = ?");
    const result = stmt.get(modelId);
    return toCamel(result);
  },

  findByModelId(modelId) {
    const stmt = db.prepare(
      "SELECT * FROM model_versions WHERE model_id = ? ORDER BY created_at ASC",
    );
    const results = stmt.all(modelId);
    return results.map(toCamel);
  },
  softDelete(modelId) {
    const stmt = db.prepare("UPDATE models SET deleted_at = ? WHERE id = ?");
    return stmt.run(new Date().toISOString(), modelId);
  },
};

import db from "../../../database.js";
import { toCamel, toSnake } from "snake-camel";

export default {
  create({ id, projectId }) {
    const stmt = db.prepare(`
    INSERT INTO documents (id, project_id)
    VALUES (@id, @projectId)
    RETURNING *
  `);
    const row = stmt.get({
      id,
      projectId,
    });
    return toCamel(row);
  },
  findById(id) {
    const stmt = db.prepare("SELECT * FROM documents WHERE id = ?");
    const result = stmt.get(id);
    return toCamel(result);
  },
  findByProjectId(projectId, includeDeleted = false) {
    const stmt = db.prepare(
      `SELECT d.* FROM documents d WHERE d.project_id = ? ${includeDeleted ? "" : "AND d.deleted_at IS NULL"}`,
    );
    const results = stmt.all(projectId);
    return results.map(toCamel);
  },
  update(id, updates) {
    const fields = [];
    const values = [];

    if (updates.latestVersionId !== undefined) {
      fields.push("latest_version_id = ?");
      values.push(updates.latestVersionId);
    }

    if (fields.length === 0) {
      return null;
    }
    values.push(id);
    const stmt = db.prepare(
      `UPDATE documents SET ${fields.join(", ")} WHERE id = ?`,
    );
    stmt.run(...values);
    return this.findById(id);
  },
  softDelete(id) {
    const stmt = db.prepare("UPDATE documents SET deleted_at = ? WHERE id = ?");
    return stmt.run(new Date().toISOString(), id);
  },
};

import db from "../../../database.js";
import { toCamel } from "snake-camel";
import BaseSqlRepository from "../../shared/repositories/BaseSqlRepository.js";

class DocumentVersionRepository extends BaseSqlRepository {
  constructor() {
    super({
      db,
      tableName: "document_versions",
      requiredCreateColumns: ["document_id", "name"],
    });
  }

  findAll() {
    const stmt = db.prepare(
      "SELECT id, name, created_at, project_id FROM documents",
    );
    const results = stmt.all();
    return results.map(toCamel);
  }

  findByDocumentId(documentId) {
    const stmt = db.prepare(
      "SELECT * FROM document_versions WHERE document_id = ? ORDER BY created_at ASC",
    );
    const results = stmt.all(documentId);
    return results.map(toCamel);
  }

  findDocumentInfoByVersionId(versionId) {
    const stmt = db.prepare(`
      SELECT
        dv.id AS document_version_id,
        dv.document_id,
        dv.name AS document_version_name
      FROM document_versions dv
      WHERE dv.id = ?
    `);
    const result = stmt.get(versionId);
    return result ? toCamel(result) : null;
  }

  getTraces(docId) {
    const stmt = db.prepare("SELECT * FROM traces WHERE document_id = ?");
    const results = stmt.all(docId);
    const parsedTraces = results.map((trace) => ({
      ...trace,
      selections: trace.selections ? JSON.parse(trace.selections) : null,
    }));
    return parsedTraces.map(toCamel);
  }

  softDelete(docId) {
    const stmt = db.prepare("UPDATE documents SET deleted_at = ? WHERE id = ?");
    return stmt.run(new Date().toISOString(), docId);
  }
}

export default new DocumentVersionRepository();

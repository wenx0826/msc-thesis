import db from "../../../database.js";
import { toCamel } from "snake-camel";
import BaseSqlRepository from "../../shared/repositories/BaseSqlRepository.js";

class DocumentVersionRepository extends BaseSqlRepository {
  constructor() {
    super({
      db,
      tableName: "document_versions",
      requiredCreateColumns: [
        "document_id",
        "version_number",
        "name",
        "filename",
      ],
    });
  }

  findDocumentInfoByVersionId(versionId) {
    const stmt = db.prepare(`
      SELECT
        dv.id AS document_version_id,
        dv.document_id,
        dv.name AS document_version_name,
        dv.filename AS document_file_name
      FROM document_versions dv
      WHERE dv.id = ?
    `);
    const result = stmt.get(versionId);
    return result ? toCamel(result) : null;
  }
}

export default new DocumentVersionRepository();

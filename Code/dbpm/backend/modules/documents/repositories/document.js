import db from "../../../database.js";
import { toCamel } from "snake-camel";
import BaseSqlRepository from "../../shared/repositories/BaseSqlRepository.js";

class DocumentRepository extends BaseSqlRepository {
  constructor() {
    super({
      db,
      tableName: "documents",
      requiredCreateColumns: ["project_id", "name"],
    });
  }

  count(includeDeleted = false) {
    const stmt = db.prepare(
      `SELECT COUNT(*) as count FROM documents ${includeDeleted ? "" : "WHERE deleted_at IS NULL"}`,
    );
    const result = stmt.get();
    return result.count;
  }

  getAverageWordsCount(includeDeleted = false) {
    const stmt = db.prepare(`
      SELECT COALESCE(AVG(COALESCE(dv.words_count, 0)), 0) AS average_words_count
      FROM documents d
      LEFT JOIN document_versions dv ON d.latest_version_id = dv.id
      ${includeDeleted ? "" : "WHERE d.deleted_at IS NULL"}
    `);
    const result = stmt.get();
    return result.average_words_count;
  }

  getAverageVersionsCount(includeDeleted = false) {
    const stmt = db.prepare(`
      SELECT COALESCE(AVG(COALESCE(d.latest_version_number, 0)), 0) AS average_versions_count
      FROM documents d
      ${includeDeleted ? "" : "WHERE d.deleted_at IS NULL"}
    `);
    const result = stmt.get();
    return result.average_versions_count;
  }

  findById(id) {
    const stmt = db.prepare("SELECT * FROM documents WHERE id = ?");
    const result = stmt.get(id);
    return result ? toCamel(result) : null;
  }

  findByProjectId(projectId, includeDeleted = false) {
    const stmt = db.prepare(`
      SELECT *
      FROM documents 
      WHERE project_id = ? ${includeDeleted ? "" : "AND deleted_at IS NULL"}
      ORDER BY created_at ASC
    `);
    const results = stmt.all(projectId);
    return results.map(toCamel);
  }

  findVersionsByDocumentIds(documentIds) {
    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return new Map();
    }

    const placeholders = documentIds.map(() => "?").join(", ");
    const stmt = db.prepare(`
      SELECT *
      FROM document_versions
      WHERE document_id IN (${placeholders})
      ORDER BY document_id ASC, version_number ASC
    `);
    const versions = stmt.all(...documentIds).map(toCamel);
    const versionsByDocumentId = new Map();

    for (const version of versions) {
      const existing = versionsByDocumentId.get(version.documentId);
      if (existing) {
        existing.push(version);
      } else {
        versionsByDocumentId.set(version.documentId, [version]);
      }
    }

    return versionsByDocumentId;
  }

  attachVersions(documents) {
    if (!Array.isArray(documents) || documents.length === 0) {
      return documents ?? [];
    }

    const documentIds = documents.map((document) => document.id);
    const versionsByDocumentId = this.findVersionsByDocumentIds(documentIds);

    for (const document of documents) {
      document.versions = versionsByDocumentId.get(document.id) ?? [];
    }

    return documents;
  }

  findByProjectIdWithVersions(projectId, includeDeleted = false) {
    const documents = this.findByProjectId(projectId, includeDeleted);
    return this.attachVersions(documents);
  }

  findProjectIdById(id) {
    const stmt = db.prepare("SELECT project_id FROM documents WHERE id = ?");
    const result = stmt.get(id);
    return result?.project_id ?? null;
  }

  allocateLatestVersionNumber(documentId) {
    const stmt = db.prepare(`
      UPDATE documents
      SET latest_version_number = latest_version_number + 1
      WHERE id = ?
      RETURNING latest_version_number
    `);
    const result = stmt.get(documentId);
    return result?.latest_version_number ?? null;
  }
}

export default new DocumentRepository();

import crypto from "crypto";
import db from "../../database.js";
import BaseSqlRepository from "../shared/repositories/BaseSqlRepository.js";

const AUTO_REANCHOR_TYPE = "auto_reanchor";
const REVIEW_STATUS = {
  NONE: "none",
  PENDING: "pending",
  NOTIFIED: "notified",
};
const VALID_REVIEW_STATUSES = new Set(Object.values(REVIEW_STATUS));

function parseJsonObject(value) {
  if (typeof value !== "string") {
    return {};
  }
  return JSON.parse(value);
}

function normalizeSelectionStyle(style) {
  if (!style || typeof style !== "object" || Array.isArray(style)) {
    return {};
  }
  return { ...style };
}

function normalizeReviewStatus(value) {
  if (value === undefined) {
    return undefined;
  }
  if (!VALID_REVIEW_STATUSES.has(value)) {
    throw new Error("Invalid selection reviewStatus");
  }
  return value;
}

function normalizeSelection(selection, options = {}) {
  const { fallbackId = null, allowGeneratedId = true } = options;

  if (!selection || typeof selection !== "object") {
    throw new Error("Invalid selection payload");
  }

  const selectionId =
    typeof fallbackId === "string" && fallbackId
      ? fallbackId
      : typeof selection.id === "string" && selection.id
        ? selection.id
        : Number.isFinite(selection.id)
          ? String(selection.id)
          : allowGeneratedId
            ? crypto.randomUUID()
            : null;
  if (!selectionId) {
    throw new Error("Selection id is required");
  }

  const start = Number(selection.textPosition?.start);
  const end = Number(selection.textPosition?.end);
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    throw new Error("Selection textPosition.start/end are required numbers");
  }

  const exact = selection.textQuote?.exact;
  if (typeof exact !== "string") {
    throw new Error("Selection textQuote.exact is required");
  }

  const textQuote = { exact };
  if (typeof selection.textQuote?.prefix === "string") {
    textQuote.prefix = selection.textQuote.prefix;
  }
  if (typeof selection.textQuote?.suffix === "string") {
    textQuote.suffix = selection.textQuote.suffix;
  }

  return {
    id: selectionId,
    textPosition: { start, end },
    textQuote,
    style: normalizeSelectionStyle(selection.style),
    reviewStatus: normalizeReviewStatus(selection.reviewStatus),
  };
}

function dedupeSelections(selections) {
  if (!Array.isArray(selections)) {
    return [];
  }

  const normalizedById = new Map();
  for (const rawSelection of selections) {
    const selection = normalizeSelection(rawSelection);
    normalizedById.set(selection.id, selection);
  }

  return [...normalizedById.values()];
}

function mapSelectionRowToSelection(row) {
  const textQuote = {
    exact: row.exact,
  };
  if (typeof row.prefix === "string") {
    textQuote.prefix = row.prefix;
  }
  if (typeof row.suffix === "string") {
    textQuote.suffix = row.suffix;
  }

  return {
    id: row.id,
    textPosition: {
      start: Number(row.start),
      end: Number(row.end),
    },
    textQuote,
    style: normalizeSelectionStyle(parseJsonObject(row.style)),
    reviewStatus: row.review_status,
  };
}

function mergeSelection(currentSelection, updates, selectionId) {
  const mergedSelection = {
    id: selectionId,
    textPosition: {
      start:
        updates?.textPosition?.start !== undefined
          ? updates.textPosition.start
          : currentSelection.textPosition.start,
      end:
        updates?.textPosition?.end !== undefined
          ? updates.textPosition.end
          : currentSelection.textPosition.end,
    },
    textQuote: {
      exact:
        updates?.textQuote?.exact !== undefined
          ? updates.textQuote.exact
          : currentSelection.textQuote.exact,
      prefix:
        updates?.textQuote?.prefix !== undefined
          ? updates.textQuote.prefix
          : currentSelection.textQuote.prefix,
      suffix:
        updates?.textQuote?.suffix !== undefined
          ? updates.textQuote.suffix
          : currentSelection.textQuote.suffix,
    },
    style: {
      ...(currentSelection.style || {}),
      ...(updates?.style && typeof updates.style === "object" ? updates.style : {}),
    },
    reviewStatus:
      updates?.reviewStatus !== undefined
        ? updates.reviewStatus
        : currentSelection.reviewStatus,
  };

  return normalizeSelection(mergedSelection, {
    fallbackId: selectionId,
    allowGeneratedId: false,
  });
}

class DocumentModelLinksRepository extends BaseSqlRepository {
  constructor() {
    super({
      db,
      tableName: "document_model_links",
      requiredCreateColumns: ["document_version_id", "model_version_id"],
      generatedColumns: {
        id: () => crypto.randomUUID(),
      },
      nonUpdatableColumns: ["id", "created_at"],
    });
  }

  findById(id) {
    const stmt = db.prepare(`
      SELECT l.*, mv.model_id, m.name AS model_name, dv.document_id
      FROM document_model_links l
      LEFT JOIN model_versions mv ON l.model_version_id = mv.id
      LEFT JOIN models m ON mv.model_id = m.id
      LEFT JOIN document_versions dv ON l.document_version_id = dv.id
      WHERE l.id = ?
    `);
    const row = stmt.get(id);
    if (!row) {
      return null;
    }

    const link = this.mapRow(row);
    link.selections = this.getActiveSelectionsByLinkId(link.id);
    return link;
  }

  attachActiveSelections(links) {
    const linkIds = links.map((link) => link?.id).filter(Boolean);
    const selectionsByLinkId = this.getActiveSelectionsByLinkIds(linkIds);

    for (const link of links) {
      const key = String(link.id);
      link.selections = selectionsByLinkId.get(key) || [];
    }

    return links;
  }

  findLatestByDocumentVersionId(documentVersionId, includeDeletedModels = false) {
    const stmt = db.prepare(`
      WITH ranked_links AS (
        SELECT
          l.*,
          mv.model_id,
          m.name AS model_name,
          dv.document_id,
          ROW_NUMBER() OVER (
            PARTITION BY mv.model_id
            ORDER BY mv.version_number DESC, l.created_at DESC, l.id DESC
          ) AS rank_in_model
        FROM document_model_links l
        LEFT JOIN model_versions mv ON l.model_version_id = mv.id
        LEFT JOIN models m ON mv.model_id = m.id
        LEFT JOIN document_versions dv ON l.document_version_id = dv.id
        WHERE l.document_version_id = ?
        ${includeDeletedModels ? "" : "AND m.deleted_at IS NULL"}
      )
      SELECT id, document_version_id, model_version_id,
             created_at, model_id, model_name, document_id
      FROM ranked_links
      WHERE rank_in_model = 1
      ORDER BY created_at ASC
    `);
    const rows = stmt.all(documentVersionId);
    const links = rows.map((row) => this.mapRow(row));
    return this.attachActiveSelections(links);
  }

  findLatestByModelVersionId(modelVersionId) {
    const stmt = db.prepare(`
      SELECT l.*, mv.model_id, m.name AS model_name, dv.document_id
      FROM document_model_links l
      LEFT JOIN model_versions mv ON l.model_version_id = mv.id
      LEFT JOIN models m ON mv.model_id = m.id
      LEFT JOIN document_versions dv ON l.document_version_id = dv.id
      WHERE l.model_version_id = ?
      ORDER BY dv.version_number DESC, l.created_at DESC
      LIMIT 1
    `);
    const row = stmt.get(modelVersionId);
    if (!row) {
      return null;
    }

    const link = this.mapRow(row);
    link.selections = this.getActiveSelectionsByLinkId(link.id);
    return link;
  }

  linkExists(linkId) {
    const stmt = db.prepare("SELECT id FROM document_model_links WHERE id = ?");
    return Boolean(stmt.get(linkId));
  }

  getSelectionRow(linkId, selectionId) {
    const stmt = db.prepare(`
      SELECT id, link_id, start, end, exact, prefix, suffix, style, review_status, deleted_at, created_at
      FROM document_model_link_selections
      WHERE link_id = ? AND id = ?
      LIMIT 1
    `);
    return stmt.get(linkId, selectionId) || null;
  }

  getActiveSelectionRow(linkId, selectionId) {
    const stmt = db.prepare(`
      SELECT id, link_id, start, end, exact, prefix, suffix, style, review_status, deleted_at, created_at
      FROM document_model_link_selections
      WHERE link_id = ? AND id = ? AND deleted_at IS NULL
      LIMIT 1
    `);
    return stmt.get(linkId, selectionId) || null;
  }

  getSelectionRowsByLinkId(linkId) {
    const stmt = db.prepare(`
      SELECT id, link_id, start, end, exact, prefix, suffix, style, review_status, deleted_at, created_at
      FROM document_model_link_selections
      WHERE link_id = ?
      ORDER BY created_at ASC, id ASC
    `);
    return stmt.all(linkId);
  }

  getActiveSelectionRowsByLinkId(linkId) {
    const stmt = db.prepare(`
      SELECT id, link_id, start, end, exact, prefix, suffix, style, review_status, deleted_at, created_at
      FROM document_model_link_selections
      WHERE link_id = ? AND deleted_at IS NULL
      ORDER BY created_at ASC, id ASC
    `);
    return stmt.all(linkId);
  }

  getActiveSelectionsByLinkId(linkId) {
    return this.getActiveSelectionRowsByLinkId(linkId).map(mapSelectionRowToSelection);
  }

  getActiveSelectionsByLinkIds(linkIds) {
    const uniqueLinkIds = [...new Set((linkIds || []).map((id) => String(id)).filter(Boolean))];
    const selectionsByLinkId = new Map(uniqueLinkIds.map((id) => [id, []]));
    if (uniqueLinkIds.length === 0) {
      return selectionsByLinkId;
    }

    const placeholders = uniqueLinkIds.map(() => "?").join(", ");
    const stmt = db.prepare(`
      SELECT id, link_id, start, end, exact, prefix, suffix, style, review_status, deleted_at, created_at
      FROM document_model_link_selections
      WHERE link_id IN (${placeholders}) AND deleted_at IS NULL
      ORDER BY created_at ASC, id ASC
    `);
    const rows = stmt.all(...uniqueLinkIds);

    for (const row of rows) {
      const key = String(row.link_id);
      const selections = selectionsByLinkId.get(key);
      if (!selections) {
        continue;
      }
      selections.push(mapSelectionRowToSelection(row));
    }

    return selectionsByLinkId;
  }

  appendSelectionHistoryTx({ selectionId, type, selection }) {
    const historyId = crypto.randomUUID();
    if (type === AUTO_REANCHOR_TYPE) {
      const stmt = db.prepare(`
        INSERT INTO document_model_link_selection_history (
          id, selection_id, type, start, end, exact, prefix, suffix, style
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        historyId,
        selectionId,
        AUTO_REANCHOR_TYPE,
        selection.textPosition.start,
        selection.textPosition.end,
        selection.textQuote.exact,
        typeof selection.textQuote.prefix === "string" ? selection.textQuote.prefix : null,
        typeof selection.textQuote.suffix === "string" ? selection.textQuote.suffix : null,
        JSON.stringify(normalizeSelectionStyle(selection.style)),
      );
      return historyId;
    }

    const stmt = db.prepare(`
      INSERT INTO document_model_link_selection_history (
        id, selection_id, start, end, exact, prefix, suffix, style
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      historyId,
      selectionId,
      selection.textPosition.start,
      selection.textPosition.end,
      selection.textQuote.exact,
      typeof selection.textQuote.prefix === "string" ? selection.textQuote.prefix : null,
      typeof selection.textQuote.suffix === "string" ? selection.textQuote.suffix : null,
      JSON.stringify(normalizeSelectionStyle(selection.style)),
    );
    return historyId;
  }

  insertSelectionRowTx(linkId, selection, deletedAt = null) {
    if (selection.reviewStatus === undefined) {
      const stmt = db.prepare(`
        INSERT INTO document_model_link_selections (
          id, link_id, start, end, exact, prefix, suffix, style, deleted_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        selection.id,
        linkId,
        selection.textPosition.start,
        selection.textPosition.end,
        selection.textQuote.exact,
        typeof selection.textQuote.prefix === "string" ? selection.textQuote.prefix : null,
        typeof selection.textQuote.suffix === "string" ? selection.textQuote.suffix : null,
        JSON.stringify(normalizeSelectionStyle(selection.style)),
        deletedAt,
      );
      return;
    }

    const stmt = db.prepare(`
      INSERT INTO document_model_link_selections (
        id, link_id, start, end, exact, prefix, suffix, style, review_status, deleted_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      selection.id,
      linkId,
      selection.textPosition.start,
      selection.textPosition.end,
      selection.textQuote.exact,
      typeof selection.textQuote.prefix === "string" ? selection.textQuote.prefix : null,
      typeof selection.textQuote.suffix === "string" ? selection.textQuote.suffix : null,
      JSON.stringify(normalizeSelectionStyle(selection.style)),
      selection.reviewStatus,
      deletedAt,
    );
  }

  updateSelectionRowTx(linkId, selection, deletedAt = null) {
    if (selection.reviewStatus === undefined) {
      const stmt = db.prepare(`
        UPDATE document_model_link_selections
        SET start = ?, end = ?, exact = ?, prefix = ?, suffix = ?, style = ?, deleted_at = ?
        WHERE id = ? AND link_id = ?
      `);
      stmt.run(
        selection.textPosition.start,
        selection.textPosition.end,
        selection.textQuote.exact,
        typeof selection.textQuote.prefix === "string" ? selection.textQuote.prefix : null,
        typeof selection.textQuote.suffix === "string" ? selection.textQuote.suffix : null,
        JSON.stringify(normalizeSelectionStyle(selection.style)),
        deletedAt,
        selection.id,
        linkId,
      );
      return;
    }

    const stmt = db.prepare(`
      UPDATE document_model_link_selections
      SET start = ?, end = ?, exact = ?, prefix = ?, suffix = ?, style = ?, review_status = ?, deleted_at = ?
      WHERE id = ? AND link_id = ?
    `);
    stmt.run(
      selection.textPosition.start,
      selection.textPosition.end,
      selection.textQuote.exact,
      typeof selection.textQuote.prefix === "string" ? selection.textQuote.prefix : null,
      typeof selection.textQuote.suffix === "string" ? selection.textQuote.suffix : null,
      JSON.stringify(normalizeSelectionStyle(selection.style)),
      selection.reviewStatus,
      deletedAt,
      selection.id,
      linkId,
    );
  }

  markSelectionDeletedTx(linkId, selectionId, deletedAt) {
    const stmt = db.prepare(`
      UPDATE document_model_link_selections
      SET deleted_at = ?
      WHERE id = ? AND link_id = ?
    `);
    stmt.run(deletedAt, selectionId, linkId);
  }

  replaceSelectionsTx(targetLinkId, targetSelections, type = undefined) {
    const existingRows = this.getSelectionRowsByLinkId(targetLinkId);
    const existingById = new Map(existingRows.map((row) => [String(row.id), row]));
    const incomingIds = new Set();

    for (const selection of targetSelections) {
      const selectionId = String(selection.id);
      incomingIds.add(selectionId);
      const existingRow = existingById.get(selectionId);

      if (existingRow) {
        this.updateSelectionRowTx(targetLinkId, selection, null);
      } else {
        this.insertSelectionRowTx(targetLinkId, selection, null);
      }

      this.appendSelectionHistoryTx({
        selectionId,
        type,
        selection,
      });
    }

    const deletedAt = new Date().toISOString();
    for (const row of existingRows) {
      const selectionId = String(row.id);
      if (incomingIds.has(selectionId) || row.deleted_at) {
        continue;
      }

      const currentSelection = mapSelectionRowToSelection(row);
      this.markSelectionDeletedTx(targetLinkId, selectionId, deletedAt);
      this.appendSelectionHistoryTx({
        selectionId,
        type,
        selection: currentSelection,
      });
    }
  }

  replaceSelections(linkId, selections = [], type = undefined) {
    const normalizedSelections = dedupeSelections(selections);

    const transaction = db.transaction((targetLinkId, targetSelections, type) => {
      if (!this.linkExists(targetLinkId)) {
        throw new Error("Link not found");
      }
      this.replaceSelectionsTx(targetLinkId, targetSelections, type);
    });

    transaction(linkId, normalizedSelections, type);
    return this.findById(linkId);
  }

  createWithSelections({
    documentVersionId,
    modelVersionId,
    selections = [],
    type = undefined,
  }) {
    const normalizedSelections = dedupeSelections(selections);

    const transaction = db.transaction(
      (targetDocumentVersionId, targetModelVersionId, targetSelections, type) => {
        const createdLink = super.create({
          documentVersionId: targetDocumentVersionId,
          modelVersionId: targetModelVersionId,
        });
        this.replaceSelectionsTx(createdLink.id, targetSelections, type);
        return createdLink.id;
      },
    );

    const linkId = transaction(
      documentVersionId,
      modelVersionId,
      normalizedSelections,
      type,
    );
    return this.findById(linkId);
  }

  createSelection(linkId, selection, type = undefined) {
    const normalizedSelection = normalizeSelection(selection);

    const transaction = db.transaction((targetLinkId, nextSelection, type) => {
      if (!this.linkExists(targetLinkId)) {
        throw new Error("Link not found");
      }

      const existing = this.getSelectionRow(targetLinkId, nextSelection.id);
      if (existing && !existing.deleted_at) {
        throw new Error("Selection already exists");
      }

      if (existing) {
        this.updateSelectionRowTx(targetLinkId, nextSelection, null);
      } else {
        this.insertSelectionRowTx(targetLinkId, nextSelection, null);
      }

      this.appendSelectionHistoryTx({
        selectionId: nextSelection.id,
        type,
        selection: nextSelection,
      });
    });

    transaction(linkId, normalizedSelection, type);
    return this.findById(linkId);
  }

  updateSelection(linkId, selectionId, updates = {}, type = undefined) {
    const transaction = db.transaction((targetLinkId, targetSelectionId, patch, type) => {
      if (!this.linkExists(targetLinkId)) {
        throw new Error("Link not found");
      }

      const currentRow = this.getActiveSelectionRow(targetLinkId, targetSelectionId);
      if (!currentRow) {
        throw new Error("Selection not found");
      }

      const currentSelection = mapSelectionRowToSelection(currentRow);
      const mergedSelection = mergeSelection(currentSelection, patch, targetSelectionId);

      this.updateSelectionRowTx(targetLinkId, mergedSelection, null);
      this.appendSelectionHistoryTx({
        selectionId: targetSelectionId,
        type,
        selection: mergedSelection,
      });
    });

    transaction(linkId, selectionId, updates, type);
    return this.findById(linkId);
  }

  softDeleteSelection(linkId, selectionId, type = undefined) {
    const transaction = db.transaction((targetLinkId, targetSelectionId, type) => {
      if (!this.linkExists(targetLinkId)) {
        throw new Error("Link not found");
      }

      const currentRow = this.getActiveSelectionRow(targetLinkId, targetSelectionId);
      if (!currentRow) {
        throw new Error("Selection not found");
      }

      const currentSelection = mapSelectionRowToSelection(currentRow);
      this.markSelectionDeletedTx(
        targetLinkId,
        targetSelectionId,
        new Date().toISOString(),
      );
      this.appendSelectionHistoryTx({
        selectionId: targetSelectionId,
        type,
        selection: currentSelection,
      });
    });

    transaction(linkId, selectionId, type);
    return this.findById(linkId);
  }

  updateByModelId(modelVersionId, selections, type = undefined) {
    const latestLink = this.findLatestByModelVersionId(modelVersionId);
    if (!latestLink?.id) {
      return { changes: 0 };
    }
    this.replaceSelections(latestLink.id, selections, type);
    return { changes: 1 };
  }
}

export { AUTO_REANCHOR_TYPE };
export default new DocumentModelLinksRepository();

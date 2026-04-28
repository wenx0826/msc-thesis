import { Store } from "../../../shared/utils/store.js";
import {
  deserializeRange,
  serializeRange,
  getSortedSelectionsByRange,
} from "../../../modules/document/selection.js";
import {
  buildStyleSyncedSelections,
  classifyLinkSelectionChange,
  derivePendingTextChangedSelectionIds,
} from "../utils/link-selection-draft.js";
const REVIEW_STATUS = {
  NONE: "none",
  PENDING: "pending",
  NOTIFIED: "notified",
};
const VALID_REVIEW_STATUSES = new Set(Object.values(REVIEW_STATUS));

function generateSelectionId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `selection_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function resolveSelectionId(selection) {
  const id = selection?.id ?? null;
  if (id !== undefined && id !== null && String(id) !== "") {
    return id;
  }
  return generateSelectionId();
}

function normalizeReviewStatus(value) {
  if (VALID_REVIEW_STATUSES.has(value)) {
    return value;
  }
  return undefined;
}

function hydrateSelections(selections) {
  if (!Array.isArray(selections)) {
    return [];
  }

  return selections
    .map((selection) => {
      const range = deserializeRange(selection?.textPosition);
      if (!range) {
        return null;
      }
      const normalizedReviewStatus = normalizeReviewStatus(
        selection?.reviewStatus,
      );
      return {
        id: resolveSelectionId(selection),
        textPosition: selection?.textPosition,
        textQuote: selection?.textQuote,
        style:
          selection?.style && typeof selection.style === "object"
            ? { ...selection.style }
            : {},
        ...(normalizedReviewStatus
          ? { reviewStatus: normalizedReviewStatus }
          : {}),
        range,
      };
    })
    .filter(Boolean);
}

function cloneSerializedSelections(selections) {
  if (!Array.isArray(selections)) {
    return [];
  }
  return JSON.parse(JSON.stringify(selections));
}

function cloneSelectionDraft(selection) {
  if (!selection || typeof selection !== "object") {
    return selection;
  }

  return {
    ...selection,
    textQuote:
      selection?.textQuote && typeof selection.textQuote === "object"
        ? JSON.parse(JSON.stringify(selection.textQuote))
        : selection?.textQuote,
    style:
      selection?.style && typeof selection.style === "object"
        ? { ...selection.style }
        : {},
    range:
      selection?.range &&
      typeof selection.range.cloneRange === "function"
        ? selection.range.cloneRange()
        : selection?.range,
  };
}

function cloneLinkDraft(link) {
  if (!link || typeof link !== "object") {
    return null;
  }

  return {
    ...link,
    selections: Array.isArray(link.selections)
      ? link.selections.map((selection) => cloneSelectionDraft(selection))
      : [],
  };
}

class DocumentViewerStore extends Store {
  constructor() {
    super({
      status: null,
      content: null,
      links: [],
      hasSelectionChanged: false,
      editingModelLink: null,
      editingModelLinkSelectionChangeType: "no_change",
      pendingEditingModelLinkSelectionIds: [],
      originalEditingModelSerializedSelections: null,
      unlinkedSelections: [],
      selectionColor: "#d4e1f1",
      selectedSelection: null,
    });
  }

  areRangesEqual(rangeA, rangeB) {
    if (!rangeA || !rangeB) return false;
    return (
      rangeA.startContainer === rangeB.startContainer &&
      rangeA.startOffset === rangeB.startOffset &&
      rangeA.endContainer === rangeB.endContainer &&
      rangeA.endOffset === rangeB.endOffset
    );
  }

  areIdsEqual(idA, idB) {
    if (
      idA === undefined ||
      idA === null ||
      idB === undefined ||
      idB === null
    ) {
      return false;
    }
    return String(idA) === String(idB);
  }

  getSelectionBackgroundColor(selection) {
    const value = selection?.style?.backgroundColor;
    return typeof value === "string" ? value : null;
  }

  setSelectionBackgroundColor(selection, backgroundColor) {
    const style =
      selection?.style && typeof selection.style === "object"
        ? selection.style
        : {};
    selection.style = {
      ...style,
      backgroundColor,
    };
  }

  serializeSelection(selection) {
    const serializedAnchors = serializeRange(selection.range);
    const currentBackgroundColor = this.getSelectionBackgroundColor(selection);
    const serialized = {
      id: resolveSelectionId(selection),
      ...serializedAnchors,
      style: {
        backgroundColor: currentBackgroundColor || this.getSelectionColor(),
      },
    };
    const normalizedReviewStatus = normalizeReviewStatus(
      selection?.reviewStatus,
    );
    if (normalizedReviewStatus) {
      serialized.reviewStatus = normalizedReviewStatus;
    }
    return serialized;
  }

  clear() {
    this.setContent(null);
    this.setLinks([]);
    this.setEditingModelLink(null);
    this.setUnlinkedSelections([]);
    this.setHasSelectionChanged(false);
    this.setSelectedSelection(null);
  }

  getStatus() {
    return this.state.status;
  }

  getHtmlContent() {
    return this.state.htmlContent;
  }

  getId() {
    return this.state.id;
  }

  setStatus(newValue) {
    this.state.status = newValue;
    this.notify({ key: "status", newValue });
  }

  setContent(newValue) {
    this.state.content = newValue;
    this.notify({ key: "content", newValue });
  }

  getSelectionColor() {
    return this.state.selectionColor;
  }

  setSelectionColor(newValue) {
    const oldValue = this.state.selectionColor;
    if (!newValue || oldValue === newValue) {
      return;
    }
    this.state.selectionColor = newValue;
    this.notify({ key: "selectionColor", oldValue, newValue });
  }

  getSelectedSelection() {
    return this.state.selectedSelection;
  }

  setSelectedSelection(newValue) {
    const oldValue = this.state.selectedSelection;
    const normalizedValue = newValue
      ? {
          selectionId: newValue.selectionId,
          modelId: newValue.modelId,
          modelVersionId: newValue.modelVersionId,
          linkId: newValue.linkId,
          scope: newValue.scope,
        }
      : null;

    const isSameSelection =
      oldValue?.selectionId === normalizedValue?.selectionId &&
      oldValue?.modelId === normalizedValue?.modelId &&
      oldValue?.modelVersionId === normalizedValue?.modelVersionId &&
      oldValue?.linkId === normalizedValue?.linkId &&
      oldValue?.scope === normalizedValue?.scope;
    if (isSameSelection) {
      return;
    }

    this.state.selectedSelection = normalizedValue;
    this.notify({
      key: "selectedSelection",
      oldValue,
      newValue: normalizedValue,
    });
  }

  getHasSelectionChanged() {
    return this.state.hasSelectionChanged;
  }

  computeSelectionChanged() {
    const hasSelectionChanged =
      this.hasUnlinkedSelection() ||
      this.hasPendingEditingModelLinkTextChanges();
    this.setHasSelectionChanged(hasSelectionChanged);
  }

  setHasSelectionChanged(newValue) {
    const oldValue = this.state.hasSelectionChanged;
    if (oldValue === newValue) return;
    this.state.hasSelectionChanged = newValue;
    this.notify({ key: "hasSelectionChanged", oldValue, newValue });
  }

  getEditingModelLinkSelectionChangeType() {
    return this.state.editingModelLinkSelectionChangeType;
  }

  setEditingModelLinkSelectionChangeType(newValue) {
    const oldValue = this.state.editingModelLinkSelectionChangeType;
    if (oldValue === newValue) {
      return;
    }
    this.state.editingModelLinkSelectionChangeType = newValue;
    this.notify({
      key: "editingModelLinkSelectionChangeType",
      oldValue,
      newValue,
    });
  }

  getPendingEditingModelLinkSelectionIds() {
    return [...this.state.pendingEditingModelLinkSelectionIds];
  }

  setPendingEditingModelLinkSelectionIds(selectionIds) {
    const normalizedIds = Array.isArray(selectionIds)
      ? [...new Set(selectionIds.map((selectionId) => String(selectionId)))]
      : [];
    const oldValue = this.getPendingEditingModelLinkSelectionIds();
    const isSameValue =
      oldValue.length === normalizedIds.length &&
      oldValue.every((selectionId, index) => selectionId === normalizedIds[index]);
    if (isSameValue) {
      return;
    }
    this.state.pendingEditingModelLinkSelectionIds = normalizedIds;
    this.notify({
      key: "pendingEditingModelLinkSelectionIds",
      oldValue,
      newValue: this.getPendingEditingModelLinkSelectionIds(),
    });
  }

  hasPendingEditingModelLinkTextChanges() {
    return this.getEditingModelLinkSelectionChangeType() === "text_changed";
  }

  recomputeEditingModelLinkDraftState() {
    const previousSelections =
      this.getOriginalEditingModelSerializedSelections() || [];
    const currentSelections =
      this.getSerializedEditingModelLink()?.selections || [];
    const changeType = classifyLinkSelectionChange({
      previousSelections,
      currentSelections,
    });
    const pendingSelectionIds = derivePendingTextChangedSelectionIds({
      previousSelections,
      currentSelections,
    });

    this.setEditingModelLinkSelectionChangeType(changeType);
    this.setPendingEditingModelLinkSelectionIds(pendingSelectionIds);
    this.computeSelectionChanged();

    return {
      changeType,
      pendingSelectionIds,
    };
  }

  getMatchingEditingModelLink({ linkId, modelId, modelVersionId } = {}) {
    const editingModelLink = this.getDisplayedEditingModelLink();
    if (!editingModelLink) {
      return null;
    }

    if (
      linkId !== undefined &&
      linkId !== null &&
      this.areIdsEqual(editingModelLink.id, linkId)
    ) {
      return editingModelLink;
    }

    if (
      modelId !== undefined &&
      modelId !== null &&
      this.areIdsEqual(editingModelLink.modelId, modelId)
    ) {
      if (
        modelVersionId === undefined ||
        modelVersionId === null ||
        this.areIdsEqual(editingModelLink.modelVersionId, modelVersionId)
      ) {
        return editingModelLink;
      }
    }

    return null;
  }

  // #region links && editing model link
  addLink(link) {
    link.selections = hydrateSelections(link.selections);
    this.state.links.push(link);
    this.setEditingModelLink(link);
  }

  setLinks(links) {
    if (links.length) {
      links.forEach((link) => {
        link.selections = hydrateSelections(link.selections);
      });
    }
    this.state.links = links;
    this.notify({ key: "links", operation: "init" });
  }

  updateLink(serializedLink) {
    const updatedStoredLink = this.updateStoredLink(serializedLink);
    if (!updatedStoredLink) {
      return null;
    }
    if (this.areIdsEqual(this.state.editingModelLink?.id, updatedStoredLink.id)) {
      this.setEditingModelLink(updatedStoredLink);
    }
    return updatedStoredLink;
  }

  updateStoredLink(serializedLink) {
    const index = this.state.links.findIndex(
      (link) => this.areIdsEqual(link.id, serializedLink?.id),
    );
    if (index === -1) {
      return null;
    }

    const updatedLink = {
      ...this.state.links[index],
      ...serializedLink,
      selections: hydrateSelections(serializedLink?.selections),
    };
    this.state.links[index] = updatedLink;
    this.notify({
      key: "links",
      operation: "update",
      value: updatedLink,
    });
    return updatedLink;
  }

  getLinks() {
    return this.state.links;
  }

  removeLinksByModelId(modelId) {
    if (modelId === undefined || modelId === null) {
      return [];
    }

    const removed = this.state.links.filter((link) =>
      this.areIdsEqual(link?.modelId, modelId),
    );
    if (!removed.length) {
      return [];
    }

    const links = this.state.links.filter(
      (link) => !this.areIdsEqual(link?.modelId, modelId),
    );
    const currentEditingModelLink = this.getDisplayedEditingModelLink();
    if (this.areIdsEqual(currentEditingModelLink?.modelId, modelId)) {
      this.setEditingModelLink(null);
    }

    const selectedSelection = this.getSelectedSelection();
    if (this.areIdsEqual(selectedSelection?.modelId, modelId)) {
      this.setSelectedSelection(null);
    }

    this.setLinks(links);
    return removed;
  }

  getLinkById(linkId) {
    return this.state.links.find((link) => this.areIdsEqual(link.id, linkId));
  }

  getDisplayedEditingModelLink() {
    return this.state.editingModelLink;
  }

  getSerializedEditingModelLink() {
    const editingModelLink = this.state.editingModelLink;
    if (editingModelLink) {
      return {
        ...editingModelLink,
        selections: editingModelLink.selections.map((selection) =>
          this.serializeSelection(selection),
        ),
      };
    }
  }

  getSerializedLinkById(linkId) {
    const link = this.getLinkById(linkId);
    if (!link) {
      return null;
    }
    return {
      ...link,
      selections: this.getSerializedSelections(link.selections || []),
    };
  }

  getOriginalEditingModelSerializedSelections() {
    return cloneSerializedSelections(
      this.state.originalEditingModelSerializedSelections,
    );
  }

  setOriginalEditingModelSerializedSelections(selections) {
    this.state.originalEditingModelSerializedSelections =
      cloneSerializedSelections(selections);
    this.recomputeEditingModelLinkDraftState();
  }

  syncOriginalEditingModelSerializedSelectionsWithEditingModelLink() {
    const editingModelLink = this.getSerializedEditingModelLink();
    this.setOriginalEditingModelSerializedSelections(
      editingModelLink?.selections || [],
    );
  }

  getSerializedEditingModelLinkForStyleSync() {
    const editingModelLink = this.getSerializedEditingModelLink();
    if (!editingModelLink?.id) {
      return null;
    }

    const previousSelections =
      this.getOriginalEditingModelSerializedSelections() || [];
    return {
      ...editingModelLink,
      selections: buildStyleSyncedSelections({
        previousSelections,
        currentSelections: editingModelLink.selections || [],
      }),
    };
  }

  // Editing model link
  setEditingModelLink(newValue) {
    const oldValue = this.state.editingModelLink;
    const normalizedValue = cloneLinkDraft(newValue);
    this.state.editingModelLink = normalizedValue;
    this.state.originalEditingModelSerializedSelections = cloneSerializedSelections(
      normalizedValue?.selections
        ? this.getSerializedSelections(normalizedValue.selections)
        : [],
    );
    this.recomputeEditingModelLinkDraftState();
    this.notify({ key: "editingModelLink", oldValue, newValue: normalizedValue });
  }

  setEditingModelLinkBySerializedLink(link) {
    link.selections = hydrateSelections(link.selections);
    this.setEditingModelLink(link);
  }

  setEditingModelLinkByModelVersionId(modelVersionId) {
    if (modelVersionId === undefined || modelVersionId === null) {
      this.setEditingModelLink(null);
      return;
    }
    if (
      this.areIdsEqual(this.state.editingModelLink?.modelVersionId, modelVersionId)
    ) {
      return;
    }
    const link = this.state.links.find((link) =>
      this.areIdsEqual(link?.modelVersionId, modelVersionId),
    );
    this.setEditingModelLink(link || null);
  }
  setEditingModelLinkById(linkId) {
    if (this.areIdsEqual(this.state.editingModelLink?.id, linkId)) {
      return;
    }
    const link = this.getLinkById(linkId);
    this.setEditingModelLink(link);
  }
  setEditingModelLinkByModelId(modelId) {
    const link = this.state.links.find((link) => link.modelId == modelId);
    this.setEditingModelLink(link || null);
  }

  removeEditingModelLinkSelectionById(selectionId) {
    return this.removeLinkSelection({ selectionId });
  }

  removeLinkSelection({ selectionId, linkId, modelId }) {
    let link = this.getMatchingEditingModelLink({ linkId, modelId });
    if (!link && linkId !== undefined && linkId !== null) {
      link = this.getLinkById(linkId);
    }
    if (!link && modelId !== undefined && modelId !== null) {
      link = this.state.links.find((item) =>
        this.areIdsEqual(item.modelId, modelId),
      );
    }
    if (!link) {
      link = this.getDisplayedEditingModelLink();
    }
    if (!link || !link.selections) {
      return null;
    }

    const index = link.selections.findIndex((selection) =>
      this.areIdsEqual(selection.id, selectionId),
    );
    if (index === -1) {
      return null;
    }

    const [removedSelection] = link.selections.splice(index, 1);
    if (this.areIdsEqual(this.state.editingModelLink?.id, link.id)) {
      this.recomputeEditingModelLinkDraftState();
      this.notify({
        key: "editingModelLink.selections",
        operation: "remove",
        value: removedSelection,
      });
    } else {
      this.notify({
        key: "links",
        operation: "update",
        value: link,
      });
    }

    return link;
  }

  updateEditingModelLinkSelectionColor(selectionId, color) {
    return this.updateLinkSelectionColor({ selectionId, color });
  }

  updateLinkSelectionColor({ selectionId, linkId, modelId, color }) {
    let link = this.getMatchingEditingModelLink({ linkId, modelId });
    if (!link && linkId !== undefined && linkId !== null) {
      link = this.getLinkById(linkId);
    }
    if (!link && modelId !== undefined && modelId !== null) {
      link = this.state.links.find((item) =>
        this.areIdsEqual(item.modelId, modelId),
      );
    }
    if (!link) {
      link = this.getDisplayedEditingModelLink();
    }
    if (!link || !link.selections) {
      return null;
    }

    const selection = link.selections.find((sel) =>
      this.areIdsEqual(sel.id, selectionId),
    );
    if (!selection || this.getSelectionBackgroundColor(selection) === color) {
      return null;
    }
    this.setSelectionBackgroundColor(selection, color);

    if (this.areIdsEqual(this.state.editingModelLink?.id, link.id)) {
      this.recomputeEditingModelLinkDraftState();
      this.notify({
        key: "editingModelLink.selections",
        operation: "update",
        value: selection,
      });
    } else {
      this.notify({
        key: "links",
        operation: "update",
        value: link,
      });
    }

    return link;
  }

  updateEditingModelLinkSelectionRange(selectionId, range) {
    const editingModelLink = this.getDisplayedEditingModelLink();
    if (editingModelLink) {
      const selection = editingModelLink.selections.find((sel) =>
        this.areIdsEqual(sel.id, selectionId),
      );
      if (selection && !this.areRangesEqual(selection.range, range)) {
        selection.range = range.cloneRange();
        this.recomputeEditingModelLinkDraftState();
        this.notify({
          key: "editingModelLink.selections",
          operation: "update",
          value: selection,
        });
      }
    }
  }

  updateLinkSelectionRange({ selectionId, linkId, modelId, range }) {
    if (!range) return false;
    let link = this.getMatchingEditingModelLink({ linkId, modelId });

    if (!link && linkId !== undefined && linkId !== null) {
      link = this.getLinkById(linkId);
    }
    if (!link && modelId !== undefined && modelId !== null) {
      link = this.state.links.find((item) =>
        this.areIdsEqual(item.modelId, modelId),
      );
    }
    if (!link) {
      link = this.getDisplayedEditingModelLink();
    }
    if (!link || !link.selections) return false;

    const selection = link.selections.find((item) =>
      this.areIdsEqual(item.id, selectionId),
    );
    if (!selection || this.areRangesEqual(selection.range, range)) {
      return false;
    }

    selection.range = range.cloneRange();

    if (this.areIdsEqual(this.state.editingModelLink?.id, link.id)) {
      this.recomputeEditingModelLinkDraftState();
      this.notify({
        key: "editingModelLink.selections",
        operation: "update",
        value: selection,
      });
    } else {
      this.notify({
        key: "links",
        operation: "update",
        value: link,
      });
    }
    return true;
  }

  // #endregion

  // #region unlinked selections
  getUnlinkedSelections() {
    return this.state.unlinkedSelections;
  }

  hasUnlinkedSelection() {
    return this.getUnlinkedSelections().length > 0;
  }

  getSerializedUnlinkedSelections() {
    this.state.unlinkedSelections = getSortedSelectionsByRange(
      this.getUnlinkedSelections(),
    );
    return this.state.unlinkedSelections.map((selection) =>
      this.serializeSelection(selection),
    );
  }

  addUnlinkedSelection(selection) {
    const normalizedSelection = {
      ...selection,
      style:
        selection?.style && typeof selection.style === "object"
          ? { ...selection.style }
          : {
              backgroundColor: this.getSelectionColor(),
            },
      id: resolveSelectionId(selection),
    };
    const normalizedReviewStatus = normalizeReviewStatus(
      selection?.reviewStatus,
    );
    if (normalizedReviewStatus) {
      normalizedSelection.reviewStatus = normalizedReviewStatus;
    }
    this.state.unlinkedSelections.push(normalizedSelection);
    this.notify({
      key: "unlinkedSelections",
      operation: "add",
      value: normalizedSelection,
    });
    this.recomputeEditingModelLinkDraftState();
  }

  removeUnlinkedSelection(selectionId) {
    let value;
    const index = this.state.unlinkedSelections.findIndex((sel) =>
      this.areIdsEqual(sel.id, selectionId),
    );
    if (index !== -1) {
      value = this.state.unlinkedSelections[index];
      this.state.unlinkedSelections.splice(index, 1);
    }
    this.notify({ key: "unlinkedSelections", operation: "remove", value });
    this.recomputeEditingModelLinkDraftState();
  }

  updateUnlinkedSelectionColor(selectionId, color) {
    const selection = this.state.unlinkedSelections.find((sel) =>
      this.areIdsEqual(sel.id, selectionId),
    );
    if (selection && this.getSelectionBackgroundColor(selection) !== color) {
      this.setSelectionBackgroundColor(selection, color);
      this.notify({
        key: "unlinkedSelections",
        operation: "update",
        value: selection,
      });
    }
  }

  updateUnlinkedSelectionRange(selectionId, range) {
    const selection = this.state.unlinkedSelections.find((sel) =>
      this.areIdsEqual(sel.id, selectionId),
    );
    if (selection && !this.areRangesEqual(selection.range, range)) {
      selection.range = range.cloneRange();
      this.notify({
        key: "unlinkedSelections",
        operation: "update",
        value: selection,
      });
    }
  }

  setUnlinkedSelections(newValue) {
    const oldValue = this.state.unlinkedSelections;
    this.state.unlinkedSelections = newValue;
    this.notify({
      key: "unlinkedSelections",
      oldValue,
      newValue,
    });
    this.recomputeEditingModelLinkDraftState();
  }
  // #endregion

  getSelectionsText(selections) {
    let selectedText = "";
    selections.forEach((selection) => {
      selectedText += selection.range.toString() + " ";
    });
    return selectedText.trim();
  }

  getSortedNewSelections() {
    let selections = [...this.getUnlinkedSelections()];
    const editingModelLink = this.getDisplayedEditingModelLink();
    if (editingModelLink) {
      selections = [...editingModelLink.selections, ...selections];
    }
    return getSortedSelectionsByRange(selections);
  }

  getSelectedText() {
    const sortedSelections = this.getSortedNewSelections();
    return this.getSelectionsText(sortedSelections);
  }

  getSerializedSelections(selections) {
    return selections.map((selection) => this.serializeSelection(selection));
  }

  getSerializedNewEditingModelLink() {
    const selections = this.getSortedNewSelections();
    const serializedSelections = this.getSerializedSelections(selections);
    const editingModelLink = this.getDisplayedEditingModelLink();
    return Object.assign(
      { ...editingModelLink },
      {
        selections: serializedSelections,
      },
    );
  }
}

export default new DocumentViewerStore();

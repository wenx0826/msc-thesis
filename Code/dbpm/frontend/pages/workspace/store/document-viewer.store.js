import { Store } from "../../../shared/utils/store.js";
import {
  deserializeRange,
  serializeRange,
  getSortedSelectionsByRange,
} from "../../../modules/document/selection.js";

function generateSelectionId() {
  if (
    globalThis.crypto &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }
  return `selection_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function resolveSelectionId(selection) {
  const id = selection?.id ?? selection?.selectionId ?? null;
  if (id !== undefined && id !== null && String(id) !== "") {
    return id;
  }
  return generateSelectionId();
}

function hydrateSelections(selections) {
  if (!Array.isArray(selections)) {
    return [];
  }

  return selections
    .map((selection) => {
      const range = deserializeRange(selection?.range, {
        text: selection?.text,
      });
      if (!range) {
        return null;
      }
      return {
        ...selection,
        id: resolveSelectionId(selection),
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

class DocumentViewerStore extends Store {
  constructor() {
    super({
      status: null,
      content: null,
      traces: [],
      hasSelectionChanged: false,
      activeModelTrace: null,
      originalActiveModelSerializedSelections: null,
      temporarySelections: [],
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
    if (idA === undefined || idA === null || idB === undefined || idB === null) {
      return false;
    }
    return String(idA) === String(idB);
  }

  clear() {
    this.setContent(null);
    this.setTraces([]);
    this.setActiveModelTrace(null);
    this.setTemporarySelections([]);
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
          traceId: newValue.traceId,
          scope: newValue.scope,
        }
      : null;

    const isSameSelection =
      oldValue?.selectionId === normalizedValue?.selectionId &&
      oldValue?.modelId === normalizedValue?.modelId &&
      oldValue?.modelVersionId === normalizedValue?.modelVersionId &&
      oldValue?.traceId === normalizedValue?.traceId &&
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
    let hasSelectionChanged = false;
    if (this.getTemporarySelections().length > 0) {
      hasSelectionChanged = true;
    }
    this.setHasSelectionChanged(hasSelectionChanged);
  }

  setHasSelectionChanged(newValue) {
    const oldValue = this.state.hasSelectionChanged;
    if (oldValue === newValue) return;
    this.state.hasSelectionChanged = newValue;
    this.notify({ key: "hasSelectionChanged", oldValue, newValue });
  }

  // #region traces && active trace
  addTrace(trace) {
    console.log("Adding trace:???", trace);
    trace.selections = hydrateSelections(trace.selections);
    this.state.traces.push(trace);
    this.setActiveModelTrace(trace);
  }

  setTraces(traces) {
    if (traces.length) {
      traces.forEach((trace) => {
        trace.selections = hydrateSelections(trace.selections);
      });
    }
    this.state.traces = traces;
    this.notify({ key: "traces", operation: "init" });
  }

  updateTrace(serializedTrace) {
    const index = this.state.traces.findIndex(
      (trace) => trace.id === serializedTrace.id,
    );
    if (index !== -1) {
      const trace = this.state.traces[index];
      trace.selections = hydrateSelections(serializedTrace.selections);
      this.setActiveModelTrace(trace);
    }
  }

  getTraces() {
    return this.state.traces;
  }

  removeTracesByModelId(modelId) {
    if (modelId === undefined || modelId === null) {
      return [];
    }

    const removed = this.state.traces.filter(
      (trace) => this.areIdsEqual(trace?.modelId, modelId),
    );
    if (!removed.length) {
      return [];
    }

    const traces = this.state.traces.filter(
      (trace) => !this.areIdsEqual(trace?.modelId, modelId),
    );
    const currentActiveTrace = this.getDisplayedModelTrace();
    if (this.areIdsEqual(currentActiveTrace?.modelId, modelId)) {
      this.setActiveModelTrace(null);
    }

    const selectedSelection = this.getSelectedSelection();
    if (this.areIdsEqual(selectedSelection?.modelId, modelId)) {
      this.setSelectedSelection(null);
    }

    this.setTraces(traces);
    return removed;
  }

  getTraceById(traceId) {
    return this.state.traces.find((trace) => this.areIdsEqual(trace.id, traceId));
  }

  getDisplayedModelTrace() {
    return this.state.activeModelTrace;
  }

  getSerializedActiveModelTrace() {
    const activeModelTrace = this.getDisplayedModelTrace();
    if (activeModelTrace) {
      return {
        ...activeModelTrace,
        selections: activeModelTrace.selections.map(({ range, ...rest }) => ({
          ...rest,
          range: serializeRange(range),
          text: range.toString(),
        })),
      };
    }
  }

  getSerializedTraceById(traceId) {
    const trace = this.getTraceById(traceId);
    if (!trace) {
      return null;
    }
    return {
      ...trace,
      selections: this.getSerializedSelections(trace.selections || []),
    };
  }

  getOriginalActiveModelSerializedSelections() {
    return cloneSerializedSelections(this.state.originalActiveModelSerializedSelections);
  }

  setOriginalActiveModelSerializedSelections(selections) {
    this.state.originalActiveModelSerializedSelections =
      cloneSerializedSelections(selections);
  }

  syncOriginalActiveModelSerializedSelectionsWithActiveTrace() {
    const activeModelTrace = this.getSerializedActiveModelTrace();
    this.setOriginalActiveModelSerializedSelections(
      activeModelTrace?.selections || [],
    );
  }

  setActiveModelTrace(newValue) {
    const oldValue = this.getDisplayedModelTrace();
    this.state.activeModelTrace = newValue;
    this.setOriginalActiveModelSerializedSelections(
      newValue?.selections ? this.getSerializedSelections(newValue.selections) : [],
    );
    this.notify({ key: "activeModelTrace", oldValue, newValue });
  }

  setActiveModelTraceBySerializedTrace(trace) {
    trace.selections = hydrateSelections(trace.selections);
    this.setActiveModelTrace(trace);
  }

  setActiveModelTraceByModelId(modelId) {
    const trace = this.state.traces.find((trace) => trace.modelId == modelId);
    this.setActiveModelTrace(trace);
  }

  removeActiveModelTraceSelectionById(selectionId) {
    return this.removeTraceSelection({ selectionId });
  }

  removeTraceSelection({ selectionId, traceId, modelId }) {
    let trace = null;
    if (traceId !== undefined && traceId !== null) {
      trace = this.getTraceById(traceId);
    }
    if (!trace && modelId !== undefined && modelId !== null) {
      trace = this.state.traces.find((item) => this.areIdsEqual(item.modelId, modelId));
    }
    if (!trace) {
      trace = this.getDisplayedModelTrace();
    }
    if (!trace || !trace.selections) {
      return null;
    }

    const index = trace.selections.findIndex((selection) =>
      this.areIdsEqual(selection.id, selectionId),
    );
    if (index === -1) {
      return null;
    }

    const [removedSelection] = trace.selections.splice(index, 1);
    if (this.areIdsEqual(this.state.activeModelTrace?.id, trace.id)) {
      this.notify({
        key: "activeModelTrace.selections",
        operation: "remove",
        value: removedSelection,
      });
    } else {
      this.notify({
        key: "traces",
        operation: "update",
        value: trace,
      });
    }

    return trace;
  }

  updateActiveModelTraceSelectionColor(selectionId, color) {
    return this.updateTraceSelectionColor({ selectionId, color });
  }

  updateTraceSelectionColor({ selectionId, traceId, modelId, color }) {
    let trace = null;
    if (traceId !== undefined && traceId !== null) {
      trace = this.getTraceById(traceId);
    }
    if (!trace && modelId !== undefined && modelId !== null) {
      trace = this.state.traces.find((item) => this.areIdsEqual(item.modelId, modelId));
    }
    if (!trace) {
      trace = this.getDisplayedModelTrace();
    }
    if (!trace || !trace.selections) {
      return null;
    }

    const selection = trace.selections.find((sel) =>
      this.areIdsEqual(sel.id, selectionId),
    );
    if (!selection || selection.color === color) {
      return null;
    }
    selection.color = color;

    if (this.areIdsEqual(this.state.activeModelTrace?.id, trace.id)) {
      this.notify({
        key: "activeModelTrace.selections",
        operation: "update",
        value: selection,
      });
    } else {
      this.notify({
        key: "traces",
        operation: "update",
        value: trace,
      });
    }

    return trace;
  }

  updateActiveModelTraceSelectionRange(selectionId, range) {
    const activeModelTrace = this.getDisplayedModelTrace();
    if (activeModelTrace) {
      const selection = activeModelTrace.selections.find(
        (sel) => this.areIdsEqual(sel.id, selectionId),
      );
      if (selection && !this.areRangesEqual(selection.range, range)) {
        selection.range = range.cloneRange();
        this.notify({
          key: "activeModelTrace.selections",
          operation: "update",
          value: selection,
        });
      }
    }
  }

  updateTraceSelectionRange({ selectionId, traceId, modelId, range }) {
    if (!range) return false;
    let trace = null;

    if (traceId !== undefined && traceId !== null) {
      trace = this.getTraceById(traceId);
    }
    if (!trace && modelId !== undefined && modelId !== null) {
      trace = this.state.traces.find((item) => this.areIdsEqual(item.modelId, modelId));
    }
    if (!trace) {
      trace = this.getDisplayedModelTrace();
    }
    if (!trace || !trace.selections) return false;

    const selection = trace.selections.find((item) =>
      this.areIdsEqual(item.id, selectionId),
    );
    if (!selection || this.areRangesEqual(selection.range, range)) {
      return false;
    }

    selection.range = range.cloneRange();

    if (this.areIdsEqual(this.state.activeModelTrace?.id, trace.id)) {
      this.notify({
        key: "activeModelTrace.selections",
        operation: "update",
        value: selection,
      });
    } else {
      this.notify({
        key: "traces",
        operation: "update",
        value: trace,
      });
    }
    return true;
  }

  setActiveModelTraceById(traceId) {
    const trace = this.getTraceById(traceId);
    this.setActiveModelTrace(trace);
  }
  // #endregion

  // #region temporary selections
  getTemporarySelections() {
    return this.state.temporarySelections;
  }

  getSerializedTemporarySelections() {
    this.state.temporarySelections = getSortedSelectionsByRange(
      this.getTemporarySelections(),
    );
    return this.state.temporarySelections.map(({ range, ...rest }) => ({
      ...rest,
      range: serializeRange(range),
      text: range.toString(),
    }));
  }

  addTemporarySelection(selection) {
    const normalizedSelection = {
      ...selection,
      id: resolveSelectionId(selection),
    };
    this.state.temporarySelections.push(normalizedSelection);
    this.notify({
      key: "temporarySelections",
      operation: "add",
      value: normalizedSelection,
    });
    this.computeSelectionChanged();
  }

  removeTemporarySelection(selectionId) {
    let value;
    const index = this.state.temporarySelections.findIndex(
      (sel) => this.areIdsEqual(sel.id, selectionId),
    );
    if (index !== -1) {
      value = this.state.temporarySelections[index];
      this.state.temporarySelections.splice(index, 1);
    }
    this.notify({ key: "temporarySelections", operation: "remove", value });
    this.computeSelectionChanged();
  }

  updateTemporarySelectionColor(selectionId, color) {
    const selection = this.state.temporarySelections.find(
      (sel) => this.areIdsEqual(sel.id, selectionId),
    );
    if (selection && selection.color !== color) {
      selection.color = color;
      this.notify({
        key: "temporarySelections",
        operation: "update",
        value: selection,
      });
    }
  }

  updateTemporarySelectionRange(selectionId, range) {
    const selection = this.state.temporarySelections.find(
      (sel) => this.areIdsEqual(sel.id, selectionId),
    );
    if (selection && !this.areRangesEqual(selection.range, range)) {
      selection.range = range.cloneRange();
      this.notify({
        key: "temporarySelections",
        operation: "update",
        value: selection,
      });
    }
  }

  setTemporarySelections(newValue) {
    const oldValue = this.state.temporarySelections;
    this.state.temporarySelections = newValue;
    this.notify({
      key: "temporarySelections",
      oldValue,
      newValue,
    });
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
    let selections = [...this.getTemporarySelections()];
    const activeModelTrace = this.getDisplayedModelTrace();
    if (activeModelTrace) {
      selections = [...activeModelTrace.selections, ...selections];
    }
    return getSortedSelectionsByRange(selections);
  }

  getSelectedText() {
    const sortedSelections = this.getSortedNewSelections();
    return this.getSelectionsText(sortedSelections);
  }

  getSerializedSelections(selections) {
    return selections.map(({ range, ...rest }) => ({
      ...rest,
      range: serializeRange(range),
      text: range.toString(),
    }));
  }

  getSerializedNewActiveModelTrace() {
    const selections = this.getSortedNewSelections();
    const serializedSelections = this.getSerializedSelections(selections);
    const activeModelTrace = this.getDisplayedModelTrace();
    return Object.assign(
      { ...activeModelTrace },
      {
        selections: serializedSelections,
      },
    );
  }
}

export default new DocumentViewerStore();

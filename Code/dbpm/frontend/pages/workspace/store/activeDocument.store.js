// Active Document Store - Current document state
import { createDomainStore } from "./createStore.js";
import { documentsAPI, tracesAPI } from "../../../api/index.js";
import {
  deserializeRange,
  serializeRange,
  getSortedSelectionsByRange,
} from "../util/selection.util.js";

export const activeDocumentStore = Object.assign(
  createDomainStore({
    id: null,
    status: null,
    htmlContent: null,
    traces: [],
    hasSelectionChanged: false,
    activeModelTrace: null,
    originalActiveModelSerializedSelections: null,
    temporarySelections: [],
  }),
  {
    init(documentId) {
      if (documentId) {
        return this.setDocumentById(documentId);
      }
      return Promise.resolve();
    },
    getStatus() {
      return this.state.status;
    },
    getHtmlContent() {
      return this.state.htmlContent;
    },
    getId() {
      return this.state.id;
    },
    setStatus(newValue) {
      this.state.status = newValue;
      this.notify({ key: "status", newValue });
    },
    setHtmlContent(content) {
      const newValue = new DOMParser().parseFromString(content, "text/html")
        .body.innerHTML;
      this.state.htmlContent = newValue;
      this.notify({ key: "htmlContent", newValue });
    },
    async setDocumentById(id) {
      const currentId = this.getId();
      if (id === currentId) return Promise.resolve();
      this.state.id = id;
      this.setStatus("loading");
      this.setTraces([]);
      this.setActiveModelTrace(null);
      this.setTemporarySelections([]);
      this.setHasSelectionChanged(false);
      const contentPromise = documentsAPI.getDocumentContentById(id);
      const tracesPromise = tracesAPI.getTracesByDocumentId(id);
      return new Promise((resolve, reject) => {
        contentPromise.then(
          (content) => {
            this.setHtmlContent(content);
            this.setStatus(null);
            tracesPromise
              .then((traces) => {
                console.log("Loaded traces for document:", traces);
                this.setTraces(traces);
                resolve();
              })
              .catch((error) => {
                console.log("Error loading traces:", error);
                resolve();
              });
          },
          (error) => {
            this.setHtmlContent(null);
            this.setStatus("error");
            reject(error);
          },
        );
      });
    },
    getHasSelectionChanged() {
      return this.state.hasSelectionChanged;
    },
    computeSelectionChanged() {
      let hasSelectionChanged = false;
      if (this.getTemporarySelections().length > 0) {
        hasSelectionChanged = true;
      }
      this.setHasSelectionChanged(hasSelectionChanged);
    },
    setHasSelectionChanged(newValue) {
      const oldValue = this.state.hasSelectionChanged;
      if (oldValue === newValue) return;
      this.state.hasSelectionChanged = newValue;
      this.notify({ key: "hasSelectionChanged", oldValue, newValue });
    },
    // #region traces && active trace
    addTrace(trace) {
      console.log("Adding trace:???", trace);
      trace.selections.forEach((selection) => {
        selection.range = deserializeRange(selection.range);
      });
      this.state.traces.push(trace);
      this.setActiveModelTrace(trace);
    },
    setTraces(traces) {
      if (traces.length) {
        traces.forEach((trace) => {
          trace.selections.forEach((selection) => {
            selection.range = deserializeRange(selection.range);
          });
        });
      }
      this.state.traces = traces;
      this.notify({ key: "traces", operation: "init" });
    },
    updateTrace(serializedTrace) {
      const index = this.state.traces.findIndex(
        (trace) => trace.id === serializedTrace.id,
      );
      if (index !== -1) {
        const trace = this.state.traces[index];
        trace.selections = serializedTrace.selections.map((selection) => ({
          ...selection,
          range: deserializeRange(selection.range),
        }));
        this.setActiveModelTrace(trace);
      }
    },
    getTraces() {
      return this.state.traces;
    },
    getTraceById(traceId) {
      return this.state.traces.find((trace) => trace.id == traceId);
    },
    getActiveModelTrace() {
      return this.state.activeModelTrace;
    },
    getSerializedActiveModelTrace() {
      const activeModelTrace = this.getActiveModelTrace();
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
    },
    setActiveModelTrace(newValue) {
      const oldValue = this.getActiveModelTrace();
      this.state.activeModelTrace = newValue;
      this.notify({ key: "activeModelTrace", oldValue, newValue });
    },
    setActiveModelTraceBySerializedTrace(trace) {
      trace.selections = trace.selections.map((selection) => ({
        ...selection,
        range: deserializeRange(selection.range),
      }));
      this.setActiveModelTrace(trace);
    },
    setActiveModelTraceByModelId(modelId) {
      const trace = this.state.traces.find((trace) => trace.modelId == modelId);
      this.setActiveModelTrace(trace);
    },
    removeActiveModelTraceSelectionById(selectionId) {
      let value;
      const activeModelTrace = this.getActiveModelTrace();
      if (activeModelTrace) {
        const index = activeModelTrace.selections.findIndex(
          (sel) => sel.id === selectionId,
        );
        if (index !== -1) {
          value = activeModelTrace.selections[index];
          activeModelTrace.selections.splice(index, 1);
        }
      }
      this.notify({
        key: "activeModelTrace.selections",
        operation: "remove",
        value,
      });
    },
    updateActiveModelTraceSelectionColor(selectionId, color) {
      const activeModelTrace = this.getActiveModelTrace();
      if (activeModelTrace) {
        const selection = activeModelTrace.selections.find(
          (sel) => sel.id === selectionId,
        );
        if (selection && selection.color !== color) {
          selection.color = color;
          this.notify({
            key: "activeModelTrace.selections",
            operation: "update",
            value: selection,
          });
        }
      }
    },
    setActiveModelTraceById(traceId) {
      const trace = this.getTraceById(traceId);
      this.setActiveModelTrace(trace);
    },
    // #endregion
    // #region temporary selections
    getTemporarySelections() {
      return this.state.temporarySelections;
    },
    getSerializedTemporarySelections() {
      this.state.temporarySelections = getSortedSelectionsByRange(
        this.getTemporarySelections(),
      );
      return this.state.temporarySelections.map(({ range, ...rest }) => ({
        ...rest,
        range: serializeRange(range),
        text: range.toString(),
      }));
    },
    addTemporarySelection(selection) {
      this.state.temporarySelections.push(selection);
      this.notify({
        key: "temporarySelections",
        operation: "add",
        value: selection,
      });
      this.computeSelectionChanged();
    },
    removeTemporarySelection(selectionId) {
      let value;
      const index = this.state.temporarySelections.findIndex(
        (sel) => sel.id === selectionId,
      );
      if (index !== -1) {
        value = this.state.temporarySelections[index];
        this.state.temporarySelections.splice(index, 1);
      }
      this.notify({ key: "temporarySelections", operation: "remove", value });
      this.computeSelectionChanged();
    },
    updateTemporarySelectionColor(selectionId, color) {
      const selection = this.state.temporarySelections.find(
        (sel) => sel.id === selectionId,
      );
      if (selection && selection.color !== color) {
        selection.color = color;
        this.notify({
          key: "temporarySelections",
          operation: "update",
          value: selection,
        });
      }
    },
    setTemporarySelections(newValue) {
      const oldValue = this.state.temporarySelections;
      this.state.temporarySelections = newValue;
      this.notify({
        key: "temporarySelections",
        oldValue,
        newValue,
      });
    },
    // #endregion
    getSelectionsText(selections) {
      let selectedText = "";
      selections.forEach((selection) => {
        selectedText += selection.range.toString() + " ";
      });
      return selectedText.trim();
    },
    getSortedNewSelections() {
      let selections = [...this.getTemporarySelections()];
      const activeModelTrace = this.getActiveModelTrace();
      if (activeModelTrace) {
        selections = [...activeModelTrace.selections, ...selections];
      }
      return getSortedSelectionsByRange(selections);
    },
    getSelectedText() {
      const sortedSelections = this.getSortedNewSelections();
      return this.getSelectionsText(sortedSelections);
    },
    getSerializedSelections(selections) {
      return selections.map(({ range, ...rest }) => ({
        ...rest,
        range: serializeRange(range),
        text: range.toString(),
      }));
    },
    getSerializedNewActiveModelTrace() {
      const selections = this.getSortedNewSelections();
      const serializedSelections = this.getSerializedSelections(selections);
      const activeModelTrace = this.getActiveModelTrace();
      return Object.assign(
        { ...activeModelTrace },
        {
          selections: serializedSelections,
        },
      );
    },
  },
);

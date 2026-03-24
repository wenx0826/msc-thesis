import { Store } from "../../../shared/utils/store.js";

function parseDataToRootNode(data) {
  if (!data) {
    return null;
  }
  if (typeof data === "string") {
    return $.parseXML(data).documentElement;
  }
  if (data.nodeType === 9) {
    return data.documentElement || null;
  }
  if (data.nodeType === 1) {
    return data;
  }
  throw new Error("Unsupported model data type for setData");
}

class ModelEditorStore extends Store {
  constructor() {
    super({
      status: null, // 'loading', 'ready', 'error', 'generating'
      error: null,
      statusMessage: null,
      data: null,
      latestUpdateType: null, // 'initial_load', 'regeneration', 'refinement', 'manual_selections_update'
      isGenerating: false,
    });
  }

  getSerializedRpstData() {
    const data = this.state.data;
    if (!data) {
      console.warn("No active model data available.");
      return null;
    }
    // Contract: data is always in wrapper format; inner process description is the first <description> child
    const inner =
      Array.from(data.children || []).find(
        (c) => c.localName === "description",
      ) ?? data;
    return new XMLSerializer().serializeToString(inner);
  }

  getSerializedData() {
    if (!this.state.data) {
      return null;
    }
    return new XMLSerializer().serializeToString(this.state.data);
  }

  setStatus(status) {
    this.state.status = status;
    this.notify({ key: "status", newValue: status });
  }

  setError(error) {
    this.state.error = error;
    this.notify({ key: "error", newValue: error });
  }

  getStatusMessage() {
    const message = this.state.statusMessage;
    if (!message) {
      return null;
    }
    return { ...message };
  }

  setStatusMessage(message) {
    const oldValue = this.getStatusMessage();
    this.state.statusMessage = message;
    this.notify({
      key: "statusMessage",
      oldValue,
      newValue: this.getStatusMessage(),
    });
  }

  clearStatusMessage() {
    this.setStatusMessage(null);
  }

  getLatestUpdateType() {
    return this.state.latestUpdateType;
  }

  setLatestUpdateType(updateType) {
    const oldValue = this.state.latestUpdateType;
    if (oldValue === updateType) {
      return;
    }
    this.state.latestUpdateType = updateType;
    this.notify({
      key: "latestUpdateType",
      oldValue,
      newValue: updateType,
    });
  }

  getIsGenerating() {
    return this.state.isGenerating === true;
  }

  setIsGenerating(isGenerating) {
    const normalizedValue = isGenerating === true;
    const oldValue = this.getIsGenerating();
    if (oldValue === normalizedValue) {
      return;
    }
    this.state.isGenerating = normalizedValue;
    this.notify({
      key: "isGenerating",
      oldValue,
      newValue: normalizedValue,
    });
  }

  setData(data, options = {}) {
    const hasUpdateType = Object.prototype.hasOwnProperty.call(
      options,
      "updateType",
    );

    let parsedData = null;
    try {
      parsedData = parseDataToRootNode(data);
    } catch (error) {
      console.error("Failed to parse model data XML:", error);
      this.setError(error?.message || "Failed to parse model data XML");
      return;
    }

    this.setError(null);

    if (hasUpdateType) {
      this.setLatestUpdateType(options.updateType);
    }

    const oldData = this.state.data;

    this.state.data = parsedData;
    this.notify({
      key: "data",
      oldValue: oldData,
      newValue: parsedData,
    });
  }
}

export default new ModelEditorStore();

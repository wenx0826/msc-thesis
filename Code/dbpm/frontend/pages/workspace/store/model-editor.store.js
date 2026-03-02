import { Store } from "../../../shared/utils/store.js";
import { modelsAPI } from "../../../api/index.js";
import modelsStore from "./models.store.js";
import { updateDbpmTextSelectionsInXmlNode } from "../../../modules/workflow/utils/dbpm-model-xml.js";

class ModelEditorStore extends Store {
  constructor() {
    super({
      status: null, // 'loading', 'ready', 'error', 'generating'
      error: null,
      model: null,
      data: null,
      latestUpdateType: null, // 'initial_load', 'regeneration_by_prompt', 'regeneration_by_selection', 'update_by_selection'
    });
  }

  getModel() {
    return this.state.model;
  }

  getModelId() {
    return this.state.model ? this.state.model.id : null;
  }

  getDocumentId() {
    const modelId = this.getModelId();
    return modelsStore.getModelDocumentId(modelId);
  }

  getSerializedRpstData() {
    const model = this.getModel();
    if (model) {
      const rpstElement = $("description", model.data)[0];
      if (rpstElement) {
        return new XMLSerializer().serializeToString(rpstElement);
      } else {
        console.warn("No rpst:rpst element found in model data.");
        return null;
      }
    } else {
      console.warn("No active model available.");
      return null;
    }
  }

  getSerializedData() {
    // return new XMLSerializer().serializeToString(this.state.model.data);
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
  setData(data) {
    const parsedData = $.parseXML(data).documentElement;
    this.state.data = parsedData;
    this.notify({
      key: "data",
      newValue: parsedData,
    });
  }
  // setModel(newValue) {
  //   const currentModel = this.getModel();
  //   let oldValue = null;
  //   if (currentModel) {
  //     oldValue = { ...currentModel };
  //     oldValue.data = new DOMParser().parseFromString(
  //       $(currentModel.data).serializePrettyXML(),
  //       "application/xml",
  //     ).documentElement;
  //   }
  //   this.state.model = newValue;
  //   if (newValue) {
  //     let data = new DOMParser().parseFromString(
  //       newValue.data,
  //       "application/xml",
  //     );
  //     if (data.documentElement.nodeName != "description") {
  //       data = $("description", data)[0];
  //     } else {
  //       data = data.documentElement;
  //     }
  //     newValue.data = data;
  //   }
  //   this.notify({ key: "model", oldValue, newValue });
  // }

  async setModelById(modelId) {
    if (modelId) {
      modelsAPI.getModelById(modelId).then((model) => {
        console.log("Fetched model by ID:", model);
        this.setModel(model);
      });
    } else {
      this.setModel(null);
    }
  }

  updateModelDbpmTextSelections(selectedText, meta = {}) {
    const data = this.state.data || this.getModel()?.data;
    if (!data) {
      return;
    }

    updateDbpmTextSelectionsInXmlNode(data, selectedText, meta);
  }
}

export default new ModelEditorStore();

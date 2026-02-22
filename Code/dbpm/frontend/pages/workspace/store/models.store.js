import { createStore } from "../../../shared/utils/store.js";

export default Object.assign(
  createStore({
    modelsById: {},
  }),
  {
    async init(models = []) {
      console.log("!!!! Initializing models store with models:", models);
      let modelsById = {};
      for (const model of models) {
        modelsById[model.id] = { ...model };
      }
      this.state.modelsById = modelsById;
      this.notify({ operation: "init", value: models });
    },
    addModel(value) {
      this.state.modelsById[value?.meta?.id] = value;
      this.notify({ operation: "add", value });
    },
    updateModelById(modelId, updates) {
      const value = this.state.modelsById[modelId];
      console.log("Updating model in store:", value, updates);
      if (value) {
        Object.assign(value, updates);
        this.notify({ key: "models", operation: "update", value });
      }
    },
    getModels() {
      return Object.values(this.state.modelsById);
    },
    getModelById(modelId) {
      return this.state.modelsById[modelId] || null;
    },
    getModelNameById(modelId) {
      return this.state.modelsById[modelId]?.meta?.name;
    },
    getModelGraphById(modelId) {
      return this.state.modelsById[modelId]?.svg || null;
    },
    getModelDocumentIdById(modelId) {
      return this.state.modelsById[modelId]?.documentId;
    },
    async deleteModelById(modelId) {
      this.notify({ key: "models", operation: "delete", id: modelId });
      delete this.state.modelsById[modelId];
      API.model.deleteModelById(modelId);
    },
  },
);

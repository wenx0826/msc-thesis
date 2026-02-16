// Models Store - Models list state
import { createDomainStore } from "./createStore.js";
import { documentsAPI } from "../../../api/index.js";

export const modelsStore = Object.assign(
  createDomainStore({
    modelsById: {},
  }),
  {
    async init(documents) {
      let modelsById = {};
      for (const { id: docId } of documents) {
        const docModels = await documentsAPI.getActiveModelsById(docId);
        docModels.forEach((model) => (model.documentId = docId));
        modelsById = {
          ...modelsById,
          ...docModels.reduce((acc, model) => {
            acc[model.id] = { meta: model, documentId: docId };
            return acc;
          }, {}),
        };
      }
      this.state.modelsById = modelsById;
      this.notify({ operation: "init", value: Object.values(modelsById) });
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

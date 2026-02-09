// Project Store - Project metadata state
import { createDomainStore } from "./createStore.js";
import { projectsAPI } from "../../api/index.js";

export const projectStore = Object.assign(
  createDomainStore({
    name: null,
    modelGenerationCounter: 0,
  }),
  {
    async init(projectId) {
      const { name, modelGenerationCounter } = await projectsAPI.get(projectId);
      this.setProject({ name, modelGenerationCounter });
    },
    getProjectName() {
      return this.state.name;
    },
    getModelNumber() {
      return this.state.modelGenerationCounter;
    },
    setName(val) {
      if (this.state.name !== val) {
        this.state.name = val;
        this.notify({ key: "name", newValue: val });
      }
    },
    setProject({ name, modelGenerationCounter }) {
      this.setName(name);
      this.setGeneratedModelNumber(modelGenerationCounter);
    },
    setGeneratedModelNumber(modelGenerationCounter) {
      this.state.modelGenerationCounter = modelGenerationCounter;
    },
  },
);

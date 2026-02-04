// Project Store - Project metadata state
import { createDomainStore } from "./createStore.js";
import { projectsAPI } from "../../api/index.js";

export const projectStore = Object.assign(
  createDomainStore({
    name: null,
    generatedModelNumber: 0,
  }),
  {
    async init(projectId) {
      const { name, generatedModelNumber } =
        await projectsAPI.getProjectById(projectId);
      this.setProject({ name, generatedModelNumber });
    },
    getProjectName() {
      return this.state.name;
    },
    getModelNumber() {
      return this.state.generatedModelNumber;
    },
    setName(val) {
      if (this.state.name !== val) {
        this.state.name = val;
        this.notify({ key: "name", newValue: val });
      }
    },
    setProject({ name, generatedModelNumber }) {
      this.setName(name);
      this.setGeneratedModelNumber(generatedModelNumber);
    },
    setGeneratedModelNumber(generatedModelNumber) {
      this.state.generatedModelNumber = generatedModelNumber;
    },
  },
);

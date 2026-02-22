import { createStore } from "../../shared/utils/store.js";

export default Object.assign(
  createStore({
    projectId: null,
    // documentsById: {},
  }),
  {
    setProjectId(projectId) {
      this.state.projectId = projectId;
      this.notify({ key: "projectId", newValue: projectId });
    },
    // setDocuments(documents) {
    //   this.state.documentsById = documents
  },
);

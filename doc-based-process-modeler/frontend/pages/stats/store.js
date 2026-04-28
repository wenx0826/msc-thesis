import { Store } from "../../shared/utils/store.js";

class StatsStore extends Store {
  constructor() {
    super({
      projectId: null,
      // documentsById: {},
    });
  }

  setProjectId(projectId) {
    this.state.projectId = projectId;
    this.notify({ key: "projectId", newValue: projectId });
  }
  // setDocuments(documents) {
  //   this.state.documentsById = documents
}

export default new StatsStore();

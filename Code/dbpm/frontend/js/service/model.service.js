const modelService = {
  async generateModel(userInput, rpstXml) {
    const model = activeModelStore.getModel() || {};
    // activeModelStore.setStatus("generating");
    const llm = workspaceStore.getLlmModel();
    try {
      const generatedModel = await API.model.generateModel({
        userInput,
        rpstXml,
        llm,
      });
      return generatedModel;
    } catch (error) {
      console.error("Error generating model:", error);
      return;
    }
    // await API.model
    //   .generateModel({
    //     userInput,
    //     rpstXml,
    //     llm,
    //   })
    //   .then((data) => {
    //     activeModelStore.setModel({ ...model, data });
    //   })
    //   .catch((error) => {
    //     console.error("Error generating model:", error);
    //     // activeModelStore.setError(String(error));
    //     // activeModelStore.setStatus("error");
    //   });
  },
  generateModelByPrompt(userInput) {
    this.generateModel(userInput, activeDocumentStore.getSerializedData());
  },
  async generateModelBySelections() {
    const generatedModel = await this.generateModel(
      activeDocumentStore.getSelectedText(),
      window.Constants.EMPTY_MODEL,
    );
    if (workspaceStore.hasActiveModel()) {
      // console.log("Generated Model!!!:", generatedModel);
      const model = activeModelStore.getModel();
      model.data = generatedModel;
      activeModelStore.setModel(model);
    } else {
      this.createModel(generatedModel);
    }
  },
  async createModel(generatedModel) {
    console.log("Creating Model!!!:", generatedModel);
    let model = {};
    // model.data = activeModelStore.getSerializedData();
    const generatedModelNumber = projectStore.getModelNumber() + 1;
    projectService.updateGeneratedModelNumber(generatedModelNumber);
    const name = `Model_${generatedModelNumber}`;
    model.meta = { name };
    model.data = generatedModel;
    const modelId = await API.model.createModel(model);
    model.meta.id = modelId;
    // activeModelStore.setModel(model);
    // workspaceStore.setActiveModelId(modelId);

    Store.models.addModel({
      meta: model.meta,
      documentId: Store.workspace.getActiveDocumentId(),
    });
    Store.activeModel.setModelById(modelId);
    Store.workspace.setActiveModelId(modelId);
    // selections = selections.map((range) => serializeRange(range));
    // const selections = JSON.parse(
    //   JSON.stringify(activeDocumentStore.getSerializedTemporarySelections()),
    // );

    // const selections = [
    //   ...activeDocumentStore.getSerializedTemporarySelections(),
    // ];
    // selections.forEach((selection) => {
    //   selection.id = crypto.randomUUID();
    // });
    const trace = {
      documentId: Store.workspace.getActiveDocumentId(),
      modelId,
      selections: Store.activeDocument.getSerializedTemporarySelections(),
    };

    API.trace.createTrace(trace).then(() => {
      Store.activeDocument.setTemporarySelections([]);
      Store.activeDocument.addTrace(trace);
    });
  },
  async updateActiveModelData() {
    const activeModelId = Store.workspace.getActiveModelId();
    const data = Store.activeModel.getSerializedData();
    API.model.updateModelDataById(activeModelId, data);
    // await modelsStore.updateModelDataById(activeModelId, data);
  },
};

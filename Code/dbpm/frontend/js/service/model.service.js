const modelService = {
  generateModel(userInput, rpstXml) {
    const model = activeModelStore.getModel() || {};
    // activeModelStore.setStatus("generating");
    const llm = workspaceStore.getLlmModel();
    API.model
      .generateModel({
        userInput,
        rpstXml,
        llm,
      })
      .then((data) => {
        activeModelStore.setModel({ ...model, data });
      })
      .catch((error) => {
        console.error("Error generating model:", error);
        // activeModelStore.setError(String(error));
        // activeModelStore.setStatus("error");
      });
  },
  generateModelByPrompt(userInput) {
    this.generateModel(userInput, activeDocumentStore.getSerializedData());
  },
  generateModelBySelections() {
    this.generateModel(
      activeDocumentStore.getSelectedText(),
      window.Constants.EMPTY_MODEL,
    );
  },
  async keepActiveModel() {
    let model = {};
    model.data = activeModelStore.getSerializedData();
    const generatedModelNumber = projectStore.getModelNumber() + 1;
    const name = `Model_${generatedModelNumber}`;
    model.name = name;
    const modelId = await API.model.createModel(model);
    model.id = modelId;
    activeModelStore.setModel(model);
    workspaceStore.setActiveModelId(modelId);
    modelsStore.addModel({
      name,
      id: modelId,
      documentId: workspaceStore.getActiveDocumentId(),
    });
    // selections = selections.map((range) => serializeRange(range));
    // const selections = JSON.parse(
    //   JSON.stringify(activeDocumentStore.getSerializedTemporarySelections()),
    // );

    const selections = [
      ...activeDocumentStore.getSerializedTemporarySelections(),
    ];
    selections.forEach((selection) => {
      selection.id = crypto.randomUUID();
    });
    const trace = {
      documentId: workspaceStore.getActiveDocumentId(),
      modelId,
      selections,
    };
    console.log("Trace to be created:!!!!!!!!!!!", trace);
    API.trace.createTrace(trace).then(() => {
      activeDocumentStore.addTrace(trace);
      activeDocumentStore.clearTemporarySelections([]);
    });
    API.project
      .updateProjectById(workspaceStore.getProjectId(), {
        generatedModelNumber,
      })
      .then(() => {
        projectStore.setModelNumber(generatedModelNumber);
      });
  },
  async updateActiveModelData() {
    const activeModelId = workspaceStore.getActiveModelId();
    const data = activeModelStore.getSerializedData();
    API.model.updateModelDataById(activeModelId, data);
    // await modelsStore.updateModelDataById(activeModelId, data);
  },
};

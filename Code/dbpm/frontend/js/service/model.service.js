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
  },
  generateModelByPrompt(userInput) {
    const generatedModel = this.generateModel(
      userInput,
      activeDocumentStore.getSerializedData(),
    );
    // const model = activeModelStore.getModel();
  },
  async generateModelBySelections() {
    const selectedText = activeDocumentStore.getSelectedText();
    const generatedModel = await this.generateModel(
      selectedText,
      window.Constants.EMPTY_MODEL,
    );

    const DBPM_NS = "https://example.com/dbpm";
    const eleDbpmInfo = document.implementation.createDocument(
      DBPM_NS,
      "dbpm:info",
      null,
    );
    const eleDbpmInfoRoot = eleDbpmInfo.documentElement;

    const eleDocumentInfo = eleDbpmInfo.createElementNS(
      DBPM_NS,
      "dbpm:document_info",
    );
    const eleDocumentId = eleDbpmInfo.createElementNS(
      DBPM_NS,
      "dbpm:document_id",
    );
    const documentId = Store.workspace.getActiveDocumentId();
    eleDocumentId.textContent = documentId;
    const eleDocumentName = eleDbpmInfo.createElementNS(
      DBPM_NS,
      "dbpm:document_name",
    );
    eleDocumentName.textContent =
      Store.documents.getDocumentNameById(documentId) || "Unknown Document";
    eleDocumentInfo.appendChild(eleDocumentId);
    const eleDocumentText = eleDbpmInfo.createElementNS(
      DBPM_NS,
      "dbpm:text_selections",
    );
    eleDocumentText.textContent = selectedText;
    eleDocumentInfo.appendChild(eleDocumentText);
    eleDbpmInfoRoot.appendChild(eleDocumentInfo);

    modelData = this.injectDbpmData(generatedModel, eleDbpmInfo);

    if (workspaceStore.hasActiveModel()) {
      const model = activeModelStore.getModel();
      model.hasSelectionsChanged = true; // Mark that selections have changed
      model.data = modelData;
      activeModelStore.setModel(model);
      // this.updateModelAndTrace(generatedModel, selectedText);
    } else {
      this.createModelAndTrace(modelData, selectedText);
    }
  },

  injectDbpmData(xmlString, eleDbpmInfo) {
    const parser = new DOMParser();
    const data = parser.parseFromString(xmlString, "application/xml");

    const parseError = data.getElementsByTagName("parsererror")[0];
    if (parseError) {
      throw new Error("Invalid XML: " + parseError.textContent);
    }

    const newDoc = document.implementation.createDocument(
      "",
      "description",
      null,
    );
    const root = newDoc.documentElement;

    const importedDbpmInfo = newDoc.importNode(
      eleDbpmInfo.documentElement,
      true,
    );
    root.appendChild(importedDbpmInfo);

    const importedOriginal = newDoc.importNode(data.documentElement, true);
    root.appendChild(importedOriginal);
    return $(root).serializePrettyXML();
  },
  async createModelAndTrace(modelData) {
    let model = {};
    const generatedModelNumber = projectStore.getModelNumber() + 1;
    projectService.updateGeneratedModelNumber(generatedModelNumber);
    const name = `Model_${generatedModelNumber}`;
    model.meta = { name };

    model.data = modelData;
    const documentId = Store.workspace.getActiveDocumentId();
    const trace = {
      documentId,
      selections: Store.activeDocument.getSerializedTemporarySelections(),
    };
    const { modelMeta, trace: createdTrace } =
      await API.model.createModelAndTrace({
        model,
        trace,
      });

    Store.models.addModel({
      meta: modelMeta,
      documentId,
    });
    Store.activeModel.setModelById(modelMeta.id);
    Store.workspace.setActiveModelId(modelMeta.id);
    Store.activeDocument.setTemporarySelections([]);
    Store.activeDocument.addTrace(createdTrace);
    Store.projectGraph.addModelNodeAndEdge(modelMeta, documentId);
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

    // API.trace.createTrace(createdTrace).then(() => {

    // });
  },
  async updateModel() {
    const model = Store.activeModel.getModel();
    const modelId = Store.workspace.getActiveModelId();
    const modelData = Store.activeModel.getSerializedData();
    console.log("Updating model ID:", modelId);
    if (model.hasSelectionsChanged) {
      console.log("Updating model and trace due to selection changes");
      const trace = Store.activeDocument.getSerializedNewActiveModelTrace();
      console.log("Trace to update:", trace);
      const res = await API.model.updateModel({ modelId, modelData, trace });
      console.log("Update result:", res);
      model.hasSelectionsChanged = false;
      Store.activeDocument.setTemporarySelections([]);
      Store.activeDocument.setActiveModelTraceSelections(trace.selections);
      // Store.activeModel.setModel(model);
      // const trace = Store.activeModel.getActiveModelTrace();
      // trace.selections;
      // const selectedText = Store.getTemporarySelections()
      //   .map((range) => range.toString())
      //   .join(" ");
      // const trace = {
      //   documentId: Store.workspace.getActiveDocumentId(),
      //   selections: Store.getSerializedTemporarySelections(),
      // };
      // await API.model.updateModelAndTrace(model.id, model.data, trace);
      // model.hasSelectionsChanged = false;
      // Store.activeModel.setModel(model);
    } else {
    }
  },
  async updateActiveModelData() {
    const activeModelId = Store.workspace.getActiveModelId();
    const data = Store.activeModel.getSerializedData();
    console.log("Updating model data for model ID:", activeModelId, data);
    API.model.updateModelDataById(activeModelId, data);
    // await modelsStore.updateModelDataById(activeModelId, data);
  },
};

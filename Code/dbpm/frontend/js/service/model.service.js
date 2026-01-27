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
    model.updateType = MODEL_UPDATE_TYPE.REGENERATION_BY_PROMPT;
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
      model.updateType = MODEL_UPDATE_TYPE.REGENERATION_BY_SELECTIONS;
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
  async updateActiveModel(type) {
    const model = Store.activeModel.getModel();
    const modelId = Store.workspace.getActiveModelId();
    const modelData = Store.activeModel.getSerializedData();

    if (model.updateType) type = model.updateType;

    const trace =
      type === MODEL_UPDATE_TYPE.MANUAL_UPDATE_SELECTIONS ||
      type === MODEL_UPDATE_TYPE.REGENERATION_BY_SELECTIONS
        ? Store.activeDocument.getSerializedNewActiveModelTrace()
        : null;

    const res = await API.model.updateModel(modelId, {
      modelData,
      trace,
      type,
    });
    //   console.log("Update result:", res);
    //   Store.activeDocument.setTemporarySelections([]);
    //   Store.activeDocument.setActiveModelTraceSelections(trace.selections);
    // } else {
    // }

    switch (type) {
      case MODEL_UPDATE_TYPE.REGENERATION_BY_PROMPT:
      case MODEL_UPDATE_TYPE.REGENERATION_BY_SELECTIONS:
      case MODEL_UPDATE_TYPE.MANUAL_UPDATE_SELECTIONS:
        Store.activeDocument.setTemporarySelections([]);
        Store.activeDocument.setActiveModelTraceBySerializedTrace(trace);
        // Store.activeDocument.setActiveModelTraceSelections(
        //   res.trace.selections,
        // );
        break;
      case MODEL_UPDATE_TYPE.MANUAL_UPDATE_GRAPH_CHANGED:
      case MODEL_UPDATE_TYPE.MANUAL_UPDATE_GRAPH_PROPERTIES_ONLY:
        break;
      default:
        console.warn("Unknown model update type:", type);
        break;
    }
  },

  async updateActiveModelData() {
    const activeModelId = Store.workspace.getActiveModelId();
    const data = Store.activeModel.getSerializedData();
    API.model.updateModelDataById(activeModelId, data);
    // await modelsStore.updateModelDataById(activeModelId, data);
  },

  async updateActiveModelTrace() {
    const activeModelId = Store.workspace.getActiveModelId();
    const documentId = Store.workspace.getActiveDocumentId();
    const selections = Store.activeDocument.getSerializedTemporarySelections();
    console.log(
      "Updating model trace for model ID:",
      activeModelId,
      documentId,
      selections,
    );
    API.model.updateModelTraceByModelId(activeModelId, {
      documentId,
      selections,
    });
    // await modelsStore.updateModelTraceByModelId(activeModelId, {
    //   documentId,
    //   selections,
    // });
  },
};

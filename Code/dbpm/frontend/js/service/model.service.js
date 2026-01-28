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
    const model = activeModelStore.getModel() || {};
    model.updateType = MODEL_UPDATE_TYPE.REGENERATION_BY_PROMPT;
    const generatedModel = this.generateModel(
      userInput,
      Store.activeModel.getSerializedData(), //todo get rpstXml only
    );
    const data = model.data;

    // model.data is the root element, get its document
    const doc = data.ownerDocument;
    const dbpmInfo = doc.getElementsByTagNameNS(
      "https://example.com/dbpm",
      "info",
    )[0];

    if (dbpmInfo) {
      // Insert new tag inside dbpmInfo
      const newTag = doc.createElementNS(
        "https://example.com/dbpm",
        "dbpm:prompt",
      );
      newTag.textContent = userInput;
      dbpmInfo.appendChild(newTag);

      // Serialize the updated document back to string
      model.data = $(doc.documentElement).serializePrettyXML();
    } else {
      console.warn("No dbpm:info found in model data.");
    }

    activeModelStore.setModel(model);
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
  updateDbpmTextSelections(modelData, selectedText) {
    const parser = new DOMParser();
    const data = parser.parseFromString(modelData, "application/xml");

    const dbpmInfo = $("dbpm\\:info", data)[0];
    if (!dbpmInfo) {
      console.warn("No dbpm:info found in model data.");
      // return modelData;
    }
    const documentInfo = $("dbpm\\:document_info", dbpmInfo)[0];
    if (!documentInfo) {
      console.warn("No dbpm:document_info found in model data.");
      // return modelData;
    }
    let textSelections = $("dbpm\\:text_selections", documentInfo)[0];
    if (!textSelections) {
      textSelections = data.createElementNS(
        "https://example.com/dbpm",
        "dbpm:text_selections",
      );
      documentInfo.appendChild(textSelections);
    }
    textSelections.textContent = selectedText;
    return $(data.documentElement).serializePrettyXML();
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

    if (model.updateType) {
      type = model.updateType;
      delete model.updateType;
    }
    if (
      [
        MODEL_UPDATE_TYPE.MANUAL_UPDATE_SELECTIONS,
        // MODEL_UPDATE_TYPE.REGENERATION_BY_SELECTIONS,
      ].includes(type)
    ) {
      const selectedText = Store.activeDocument.getSelectedText();
      Store.activeModel.updateModelDbpmTextSelections(selectedText);
    }
    const modelData = Store.activeModel.getSerializedData();

    const trace =
      type === MODEL_UPDATE_TYPE.MANUAL_UPDATE_SELECTIONS ||
      type === MODEL_UPDATE_TYPE.REGENERATION_BY_SELECTIONS
        ? Store.activeDocument.getSerializedNewActiveModelTrace()
        : null;
    console.log("Updating active model TRACE:", trace);
    const res = await API.model.updateModel(modelId, {
      modelData,
      trace,
      type,
    });
    if (
      [
        MODEL_UPDATE_TYPE.MANUAL_UPDATE_SELECTIONS,
        MODEL_UPDATE_TYPE.REGENERATION_BY_SELECTIONS,
      ].includes(type)
    ) {
      Store.activeDocument.setTemporarySelections([]);
      Store.activeDocument.updateTrace(trace);
    }

    // modelData = res.modelData;
  },

  async updateActiveModelTrace() {
    const activeModelId = Store.workspace.getActiveModelId();
    const documentId = Store.workspace.getActiveDocumentId();
    const selections = Store.activeDocument.getSerializedTemporarySelections();
    API.model.updateModelTraceByModelId(activeModelId, {
      documentId,
      selections,
    });
  },
};

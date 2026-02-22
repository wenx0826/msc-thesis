// Model Service - Handles model generation and updates
import { modelsAPI } from "../../../api/index.js";
import {
  workspaceStore,
  documentsStore,
  modelsStore,
  documentViewerStore,
  modelEditorStore,
  projectGraphStore,
} from "../store/index.js";
import workspaceService from "./workspace.service.js";
import { Constants } from "../../../constants.js";

// Import constants
const MODEL_UPDATE_TYPE = Constants.MODEL_UPDATE_TYPE;
const EMPTY_MODEL = Constants.EMPTY_MODEL;

export default {
  async generateModel(userInput, rpstXml) {
    const model = modelEditorStore.getModel() || {};
    const llm = workspaceStore.getLlmModel();
    try {
      const generatedModel = await modelsAPI.generateModel({
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

  async generateModelByPrompt(userInput) {
    const model = { ...modelEditorStore.getModel() };
    model.updateType = MODEL_UPDATE_TYPE.REGENERATION_BY_PROMPT;
    const rpstXml = modelEditorStore.getSerializedRpstData();
    console.log("Current RPST XML:", rpstXml);

    if (rpstXml) {
      const generatedModel = await this.generateModel(userInput, rpstXml);

      const data = model.data;
      const doc = data.ownerDocument;

      const dbpmInfo = doc.getElementsByTagNameNS(
        "https://example.com/dbpm",
        "info",
      )[0];
      if (dbpmInfo) {
        const newTag = doc.createElementNS(
          "https://example.com/dbpm",
          "dbpm:prompt",
        );
        newTag.textContent = userInput;
        dbpmInfo.appendChild(newTag);
      } else {
        console.warn("No dbpm:info found in model data.");
      }

      let currentRpst = $("description", data)[0];
      const generatedModelDoc = new DOMParser().parseFromString(
        generatedModel,
        "application/xml",
      );
      currentRpst.parentNode.replaceChild(
        doc.importNode(generatedModelDoc.documentElement, true),
        currentRpst,
      );
      model.data = $(doc.documentElement).serializePrettyXML();
      console.log("=======Updated model data:=====", model.data);
    }

    modelEditorStore.setModel(model);
    modelsAPI.logs.createLogEntry({
      event: "model_regenerated_by_prompt",
      data: { modelId: model.id },
    });
  },

  async generateModelBySelections() {
    const selectedText = documentViewerStore.getSelectedText();
    const generatedModel = await this.generateModel(selectedText, EMPTY_MODEL);
    console.log("=== line85 Generated model by selections:", generatedModel);
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
    const documentId = workspaceStore.getDisplayedDocument().id;
    eleDocumentId.textContent = documentId;
    const eleDocumentName = eleDbpmInfo.createElementNS(
      DBPM_NS,
      "dbpm:document_name",
    );
    // eleDocumentName.textContent =
    //   documentsStore.getDocumentNameById(documentId) || "Unknown Document";
    eleDocumentInfo.appendChild(eleDocumentId);
    const eleDocumentText = eleDbpmInfo.createElementNS(
      DBPM_NS,
      "dbpm:text_selections",
    );
    eleDocumentText.textContent = selectedText;
    eleDocumentInfo.appendChild(eleDocumentText);
    eleDbpmInfoRoot.appendChild(eleDocumentInfo);

    const modelData = this.injectDbpmData(generatedModel, eleDbpmInfo);

    if (workspaceStore.hasDisplayedModel()) {
      const model = { ...modelEditorStore.getModel() };
      model.updateType = MODEL_UPDATE_TYPE.REGENERATION_BY_SELECTIONS;
      model.data = modelData;
      modelEditorStore.setModel(model);
      modelsAPI.logs.createLogEntry({
        event: "model_regenerated_by_selections",
        data: { modelId: model.id },
      });
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
    }
    const documentInfo = $("dbpm\\:document_info", dbpmInfo)[0];
    if (!documentInfo) {
      console.warn("No dbpm:document_info found in model data.");
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
    const documentVersionId = workspaceStore.getDisplayedDocument().versionId;
    const trace = {
      documentVersionId,
      selections: documentViewerStore.getSerializedTemporarySelections(),
    };
    console.log(
      "==== !!!!Creating model with data:",
      workspaceStore.getProjectId(),
      modelData,
      trace,
    );

    const { model: createdModel, trace: createdTrace } =
      await modelsAPI.createModelAndTrace({
        projectId: workspaceStore.getProjectId(),
        modelData,
        trace,
      });

    // modelEditorStore.setModelById(createdModel.meta.id);
    // modelsStore.addModel({
    //   meta: createdModel.meta,
    //   documentId,
    // });
    // workspaceStore.setActiveModelId(createdModel.meta.id);
    // documentViewerStore.setTemporarySelections([]);
    // documentViewerStore.addTrace(createdTrace);
    // projectGraphStore.addModelNodeAndEdge(createdModel.meta, documentId);
  },

  async updateActiveModel(type) {
    const model = modelEditorStore.getModel();
    const modelId = workspaceStore.getDisplayedModelId();

    if (model.updateType) {
      type = model.updateType;
      delete model.updateType;
    }
    if ([MODEL_UPDATE_TYPE.MANUAL_UPDATE_SELECTIONS].includes(type)) {
      const selectedText = documentViewerStore.getSelectedText();
      modelEditorStore.updateModelDbpmTextSelections(selectedText);
    }
    const modelData = modelEditorStore.getSerializedData();

    const trace =
      type === MODEL_UPDATE_TYPE.MANUAL_UPDATE_SELECTIONS ||
      type === MODEL_UPDATE_TYPE.REGENERATION_BY_SELECTIONS
        ? documentViewerStore.getSerializedNewActiveModelTrace()
        : null;
    console.log("Updating active model TRACE:", trace);
    const res = await modelsAPI.updateModel(modelId, {
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
      documentViewerStore.setTemporarySelections([]);
      documentViewerStore.updateTrace(trace);
    }
  },

  async updateActiveModelTrace() {
    const updatedTrace = documentViewerStore.getSerializedActiveModelTrace();
    modelsAPI.traces
      .updateTrace(updatedTrace)
      .then(() => documentViewerStore.updateTrace(updatedTrace));
  },

  async deleteModel(modelId) {
    modelsAPI.deleteModelById(modelId);
    if (modelId === workspaceStore.getDisplayedModelId()) {
      workspaceService.clearModelDisplay();
    }
    const documentId = modelsStore.getModelDocumentIdById(modelId);
  },
};

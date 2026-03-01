// Model Service - Handles model generation and updates
import { modelsAPI } from "../../../api/index.js";
import {
  workspaceStore,
  modelsStore,
  documentViewerStore,
  modelEditorStore,
  projectGraphStore,
} from "../store/index.js";
import workspaceService from "./workspace.service.js";
import { Constants } from "../../../constants.js";

// Import constants
const MODEL_UPDATE_TYPE = Constants.MODEL_UPDATE_TYPE;
const MODEL_GENERATION_TARGET = Constants.MODEL_GENERATION_TARGET;
const EMPTY_MODEL = Constants.EMPTY_MODEL;

export default {
  async generateModel(userInput, rpstXml) {
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

  async generateModelBySelections(target) {
    const selectedText = documentViewerStore.getSelectedText();
    const generatedModel = await this.generateModel(selectedText, EMPTY_MODEL);
    if (!generatedModel) {
      console.warn("Model generation returned an empty result.");
      return null;
    }

    const normalizedTarget =
      target === MODEL_GENERATION_TARGET.EDITING_MODEL
        ? MODEL_GENERATION_TARGET.EDITING_MODEL
        : MODEL_GENERATION_TARGET.NEW_MODEL;

    if (normalizedTarget === MODEL_GENERATION_TARGET.NEW_MODEL) {
      return this.createModelAndTrace(generatedModel);
    }

    const currentModel = modelEditorStore.getModel();
    if (!currentModel) {
      console.warn(
        "No active editing model found for regeneration; creating a new model instead.",
      );
      return this.createModelAndTrace(generatedModel);
    }

    const model = { ...currentModel };
    model.updateType = MODEL_UPDATE_TYPE.REGENERATION_BY_SELECTIONS;
    model.data = generatedModel;
    modelEditorStore.setModel(model);
    return model;
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
    const { id: documentId, versionId: documentVersionId } =
      workspaceStore.getViewedDocument() || {};

    const trace = {
      documentVersionId,
      selections: documentViewerStore.getSerializedTemporarySelections(),
    };
    const { modelMeta: createdModelMeta, trace: createdTrace } =
      await modelsAPI.createModelAndTrace({
        projectId: workspaceStore.getProjectId(),
        modelData,
        trace,
      });

    modelsStore.add(createdModelMeta);
    modelEditorStore.setModel({
      ...createdModelMeta,
      data: modelData,
    });
    workspaceStore.setEditingModel({
      id: createdModelMeta.id,
      versionId: createdModelMeta.latestVersionId,
    });
    modelEditorStore.setData(modelData);
    documentViewerStore.setTemporarySelections([]);
    documentViewerStore.setHasSelectionChanged(false);
    documentViewerStore.addTrace(createdTrace);
    projectGraphStore.addModelNodeAndEdge(createdModelMeta);
    // return { modelMeta: createdModelMeta, trace: normalizedTrace };
  },
  async createModelVersion(modelId, sourceVersionId) {
    const sourceVersion = modelsStore.getVersion(modelId, sourceVersionId);
    const isSelectedVersionLatest = modelsStore.isLatestVersion(
      modelId,
      sourceVersionId,
    );
    const reason = isSelectedVersionLatest ? "new_version" : "revert";
    const sourceVersionLabel =
      sourceVersion?.name ||
      (typeof sourceVersion?.versionNumber === "number"
        ? `v${sourceVersion.versionNumber}`
        : String(sourceVersionId));

    const result = await modelsAPI.createVersion({
      modelId,
      sourceVersionId,
      reason,
    });
    const modelMeta = result?.modelMeta || null;
    const createdVersion =
      result?.newVersion || result?.version || (result?.id ? result : null);

    if (modelMeta && modelMeta.id === modelId) {
      modelsStore.update(modelId, modelMeta);
    } else if (createdVersion?.id) {
      modelsStore.addVersion(modelId, createdVersion);
    }

    const createdVersionId =
      modelMeta?.latestVersionId ||
      createdVersion?.id ||
      result?.latestVersionId;
    if (!createdVersionId) {
      throw new Error("Failed to resolve created model version");
    }

    workspaceStore.setEditingModel({
      id: modelId,
      versionId: createdVersionId,
    });
    await this.loadVersion(createdVersionId);

    return {
      ...(result || {}),
      meta: {
        ...(result?.meta || {}),
        reason,
        isSelectedVersionLatest,
        sourceVersionId,
        sourceVersionLabel,
      },
    };
  },
  async loadVersion(versionId) {
    const data = await modelsAPI.getDataByVersionId(versionId);
    console.log("Loaded model data for versionId", versionId, ":", data);
    modelEditorStore.setData(data);
  },
  async updateActiveModel(type) {
    console.log("here???");
    const model = modelEditorStore.getModel();
    const modelId = workspaceStore.getEditingModelId();

    if (model?.updateType) {
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
  async saveModel(type) {
    const model = modelEditorStore.getModel();
    const modelVersionId = workspaceStore.getEditingModel().versionId;

    // if (model.updateType) {
    //   type = model.updateType;
    //   delete model.updateType;
    // }
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
    const res = await modelsAPI.updateVersion(modelVersionId, {
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
  async renameModel(modelId, newName) {
    console.log(`Renaming model ${modelId} to "${newName}"`);
    const updatedModel = await modelsAPI.updateMeta(modelId, { name: newName });
    modelsStore.update(modelId, { name: updatedModel.name });
  },
  async updateActiveModelTrace() {
    const updatedTrace = documentViewerStore.getSerializedActiveModelTrace();
    modelsAPI.traces
      .updateTrace(updatedTrace)
      .then(() => documentViewerStore.updateTrace(updatedTrace));
  },

  async deleteModel(modelId) {
    if (!modelId) {
      return;
    }
    await modelsAPI.deleteModelById(modelId);
    const isEditingModel = modelId === workspaceStore.getEditingModelId();

    modelsStore.delete(modelId);
    documentViewerStore.removeTracesByModelId(modelId);
    projectGraphStore.removeModelNodeAndEdge(modelId);
    workspaceStore.setModelPopoverParams(null);

    if (isEditingModel) {
      workspaceService.clearModelDisplay();
    }
  },
};

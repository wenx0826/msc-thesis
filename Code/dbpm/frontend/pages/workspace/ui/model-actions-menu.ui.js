import { default as setModelNameEditor } from "../../../shared/widgets/inline-editor.js";
import { modelsStore, workspaceStore } from "../store/index.js";
import { modelService, workspaceService } from "../services/index.js";
import {
  getProjectWorkspaceURL,
  getProjectStatsURL,
  getProjectLogURL,
  getModelURL,
} from "../../../shared/utils/url.js";
function deleteModel(modelId) {
  modelService.deleteModel(modelId);
}

function exportTestSet(modelId) {
  //   $exportTestsetButton.on("click", (e) => {
  //       e.preventDefault();
  //       const filename = "testset_" + workspaceStore.getEditingModelId() + ".xml";
  //       const text =
  //         '<?xml version="1.0"?>\n<testset xmlns="http://cpee.org/ns/properties/2.0">\n<executionhandler>ruby</executionhandler>\n<dataelements/>\n<endpoints/>\n<attributes>\n<guarded>none</guarded>\n<modeltype>CPEE</modeltype>\n<theme>preset</theme>\n<guarded_id/>\n<info>Subprocess</info>\n<creator>Christine Ashcreek</creator>\n<author>Christine Ashcreek</author>\n<model_uuid>1fc43528-3e4a-40ee-8503-c0ed7e5d883c</model_uuid>\n<model_version/>\n<design_stage>development</design_stage>\n<design_dir>Templates.dir</design_dir>\n</attributes>\n<description>' +
  //         modelEditorStore.getSerializedRpstData() +
  //         "\n</description>\n</testset>";
  //       const mime = "application/xml;charset=utf-8";
  //       const blob = new Blob([text], { type: mime });
  //       const url = URL.createObjectURL(blob);
  //       const a = document.createElement("a");
  //       a.href = url;
  //       a.download = filename;
  //       document.body.appendChild(a);
  //       a.click();
  //       a.remove();
  //       URL.revokeObjectURL(url);
  //     });
}

// $deleteModelButton.on("click", () => {
//   modelService.deleteModel(workspaceStore.getEditingModelId());
// });
function viewXMLData(versionId) {
  window.open(getModelURL(versionId), "_blank");
}

const createModelActionsMenu = (e, { modelId, versionId }) => {
  if (!versionId) {
    versionId = modelsStore.getLatestVersionId(modelId);
  }
  const menu = {};
  menu[""] = [
    {
      label: "Rename Document",
      function_call: renameDocument,
      text_icon: undefined,
      type: undefined,
      params: [docId],
    },
    {
      label: "Upload New Version",
      function_call: uploadNewVersion,
      text_icon: undefined,
      type: undefined,
      params: [docId],
    },
    {
      label: "Delete Model",
      function_call: () => {},
      text_icon: undefined,
      type: undefined,
      params: [docId],
    },
  ];
  return menu;
};

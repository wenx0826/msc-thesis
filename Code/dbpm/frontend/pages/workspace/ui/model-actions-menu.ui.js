import { modelsStore } from "../store/index.js";
import { modelService } from "../services/index.js";
import { getModelURL } from "../../../shared/utils/url.js";
import { createMenu } from "../../../shared/utils/dom.js";

async function deleteModel(modelId) {
  try {
    await modelService.deleteModel(modelId);
  } catch (err) {
    console.error("Failed to delete model:", err);
  }
}

function renameModel(modelNameEditor, $modelNameView) {
  if (!modelNameEditor || !$modelNameView?.length) {
    return;
  }
  setTimeout(() => modelNameEditor.startEdit($modelNameView), 0);
}

function exportTestset(versionId) {
  const filename = "testset_" + versionId + ".xml";
  const modelData = modelsStore.getCachedModelByVersionId(versionId);
  // console.log(
  //   "Exporting testset for versionId:",
  //   versionId,
  //   "with data:",
  //   modelData,
  // );
  const data = (modelData?.dataXml || "").replace(
    /(<dbpm:info>[\s\S]*?<\/dbpm:info>)/g,
    (match) => `<![CDATA[${match}]]>`,
  );

  const text =
    '<?xml version="1.0"?>\n<testset xmlns="http://cpee.org/ns/properties/2.0">\n<executionhandler>ruby</executionhandler>\n<dataelements/>\n<endpoints/>\n<attributes>\n<guarded>none</guarded>\n<modeltype>CPEE</modeltype>\n<theme>preset</theme>\n<guarded_id/>\n<info></info>\n<creator></creator>\n<author></author>\n<model_uuid></model_uuid>\n<model_version/>\n<design_stage>development</design_stage>\n<design_dir>Templates.dir</design_dir>\n</attributes>\n' +
    data +
    "\n</testset>";
  const mime = "application/xml;charset=utf-8";
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function viewXMLData(versionId) {
  window.open(getModelURL(versionId), "_blank");
}
export const createViewXMLDataMenuItem = (versionId) => ({
  label: "View XML data",
  function_call: viewXMLData,
  text_icon: undefined,
  type: undefined,
  params: [versionId],
});

export const createModelActionsMenu = (
  e,
  { modelId, versionId, modelNameEditor, $modelNameView },
) => {
  if (!versionId) {
    versionId = modelsStore.getLatestVersionId(modelId);
  }

  const hasRenameControls = !!(modelNameEditor && $modelNameView);
  const menu = {};
  menu[""] = [];

  if (hasRenameControls) {
    menu[""].push({
      label: "Rename model",
      function_call: renameModel,
      text_icon: undefined,
      type: undefined,
      params: [modelNameEditor, $modelNameView],
    });
  }

  menu[""].push(
    {
      label: "View XML data",
      function_call: viewXMLData,
      text_icon: undefined,
      type: undefined,
      params: [versionId],
    },
    {
      label: "Export testset",
      function_call: exportTestset,
      text_icon: undefined,
      type: undefined,
      params: [versionId],
    },
    {
      label: "Delete model",
      function_call: deleteModel,
      text_icon: undefined,
      type: undefined,
      params: [modelId],
    },
  );
  createMenu(e, menu, { noIcons: true });
};

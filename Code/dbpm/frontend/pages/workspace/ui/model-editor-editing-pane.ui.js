import { createUI } from "../../../shared/utils/ui.js";
import {
  modelEditorStore,
  documentsStore,
  modelsStore,
  workspaceStore,
} from "../store/index.js";
import { modelService, workspaceService } from "../services/index.js";
import { endpointLoader } from "../../../modules/workflow/endpoints/endpoint-loader.js";
import { Constants } from "../../../constants.js";

const MODEL_UPDATE_TYPE = Constants.MODEL_UPDATE_TYPE;
// cosnt $graphGrid = $("#graphgrid");
const $graphCanvas = $("#graphcanvas");
const $graphGrid = $graphCanvas.parent();
const $datDetails = $("#dat_details");

// disable all controls inside
// enable all controls inside

const $regeneratedModelActionBar = $("#regeneratedModelActionBar");
const $viewPrevModelButton = $("#viewPrevModelButton");
const $viewNewModelButton = $("#viewNewModelButton");
const $revertPrevModelButton = $("#revertPrevModelButton");
const $keepNewModelButton = $("#keepNewModelButton");

let regenerationPreviewState = null;
let isApplyingRegenerationView = false;

const CALL_SUBPROCESS_MODEL_SELECT_SELECTOR = `#dat_details select[data-relaxngui-path=" > call > parameters > dbpm_subprocess_model"]`;

function saveActiveModel(type) {
  modelService.updateEditingVersion(type);
}

function clearModelEditor() {
  $graphCanvas.empty();
  $datDetails.empty();
}

function isRegenerationUpdateType(updateType) {
  return [
    MODEL_UPDATE_TYPE.REGENERATION_BY_PROMPT,
    MODEL_UPDATE_TYPE.REGENERATION_BY_SELECTIONS,
  ].includes(updateType);
}

function serializeXmlNode(node) {
  if (!node) {
    return null;
  }
  return new XMLSerializer().serializeToString(node);
}

function setRegenerationPreviewView(view) {
  if (!regenerationPreviewState) {
    return;
  }
  const normalizedView = view === "previous" ? "previous" : "regenerated";
  if (regenerationPreviewState.view === normalizedView) {
    return;
  }

  const nextDataXml =
    normalizedView === "previous"
      ? regenerationPreviewState.previousDataXml
      : regenerationPreviewState.regeneratedDataXml;
  if (!nextDataXml) {
    return;
  }

  regenerationPreviewState = {
    ...regenerationPreviewState,
    view: normalizedView,
  };
  isApplyingRegenerationView = true;
  modelEditorStore.setData(nextDataXml);
  isApplyingRegenerationView = false;
}

function applyRegenerationActionBar(updateType) {
  const preview = regenerationPreviewState;
  if (!isRegenerationUpdateType(updateType) || !preview) {
    $regeneratedModelActionBar.hide();
    return;
  }

  const isViewingPrevious = preview.view === "previous";
  $viewPrevModelButton.prop("disabled", isViewingPrevious);
  $viewNewModelButton.prop("disabled", !isViewingPrevious);
  $revertPrevModelButton.prop("disabled", false);
  $keepNewModelButton.prop("disabled", false);
  $regeneratedModelActionBar.show();
}

async function showWFGraph(data) {
  save["state"] = "ready";
  save["graph_theme"] = "preset_customized";
  save["endpoints_cache"] = endpointLoader._cache;
  save["graph_adaptor"] = new WfAdaptor(
    "modules/workflow/themes/preset_customized/theme.js",
    function (graphrealization) {
      graphrealization.illustrator.get_symbol = endpointLoader._boundGetSymbol;
      graphrealization.illustrator.get_properties =
        endpointLoader._boundGetProperties;
      graphrealization.set_svg_container($graphCanvas);
      graphrealization.set_label_container($("#graphgrid"));
      graphrealization.set_description($(data), true);
      graphrealization.notify = function (svgid) {
        // console.log("Graph realization notify for svgid:", svgid);
        var g = graphrealization.get_description();
        manifestation.events.click(svgid);
        format_instance_pos();
        if (manifestation.selected() == "unknown") {
          $datDetails.empty();
        }
        console.log(
          "Graph realization notify!! - saving active model with updated graph",
        );
        modelService.updateEditingVersion(
          MODEL_UPDATE_TYPE.MANUAL_UPDATE_GRAPH_CHANGED,
        );
        // saveActiveModel(MODEL_UPDATE_TYPE.MANUAL_UPDATE_GRAPH_CHANGED);
      };
    },
  );
}

const showActiveModel = async (model) => {
  save["state"] = "ready";
  save["graph_theme"] = "preset_customized";
  // save["endpoints_cache"] = endpointLoader._cache;
  save["graph_adaptor"] = new WfAdaptor(
    "modules/workflow/themes/preset_customized/theme.js",
    function (graphrealization) {
      graphrealization.illustrator.get_symbol = endpointLoader._boundGetSymbol;
      graphrealization.illustrator.get_properties =
        endpointLoader._boundGetProperties;
      graphrealization.set_svg_container($graphCanvas);
      graphrealization.set_label_container($graphGrid);
      graphrealization.set_description($(model?.data), true);
      graphrealization.notify = function (svgid) {
        var g = graphrealization.get_description();
        manifestation.events.click(svgid);
        format_instance_pos();
        if (manifestation.selected() == "unknown") {
          $datDetails.empty();
        }
        // saveActiveModel(MODEL_UPDATE_TYPE.MANUAL_UPDATE_GRAPH_CHANGED);
        // console.log("Saving model 222");
      };
    },
  );
};

const getModelSelectContainer = ($modelSelect) => {
  const $container = $modelSelect.closest(
    `div[data-relaxngui-path=" > call > parameters > dbpm_subprocess_model"]`,
  );
  if ($container.length > 0) {
    return $container;
  }
  const $fallbackContainer = $(
    `#dat_details div[data-relaxngui-path=" > call > parameters > dbpm_subprocess_model"]`,
  );
  if ($fallbackContainer.length > 0) {
    return $fallbackContainer.first();
  }
  return $modelSelect.parent().parent();
};

const getAvailableSubprocessModels = () => {
  const availableModels = [];
  for (const model of modelsStore.getList() || []) {
    const meta =
      model?.meta && typeof model.meta === "object" ? model.meta : model;
    const modelId = meta?.id ?? model?.id;
    const modelName = meta?.name ?? model?.name;
    const documentId = model?.documentId ?? meta?.documentId;
    if (!modelId || !documentId) {
      continue;
    }
    availableModels.push({
      documentId,
      modelId,
      modelName: modelName || modelId,
    });
  }
  return availableModels;
};

const renderModelSelect = (initialModelId = "") => {
  const $modelSelect = $(CALL_SUBPROCESS_MODEL_SELECT_SELECTOR);
  const editingModelId = workspaceStore.getEditingModel().id;
  const modelsByDocumentId = new Map();
  for (const {
    documentId,
    modelId,
    modelName,
  } of getAvailableSubprocessModels()) {
    const documentKey = String(documentId);
    if (!modelsByDocumentId.has(documentKey)) {
      modelsByDocumentId.set(documentKey, []);
    }
    modelsByDocumentId.get(documentKey).push({ modelId, modelName });
  }

  $modelSelect.empty();
  $("<option>").val("").text("--- Please select ---").appendTo($modelSelect);
  for (const { id: docId, name: docName } of documentsStore.getList() || []) {
    const $optGroup = $("<optgroup>")
      .attr("label", docName)
      .appendTo($modelSelect);
    const models = modelsByDocumentId.get(String(docId)) || [];
    for (const { modelId, modelName } of models) {
      const $option = $("<option>")
        .val(modelId)
        .text(modelName)
        .appendTo($optGroup);
      if (modelId == editingModelId) {
        $option.prop("disabled", true);
      }
    }
  }
  setModelSelectVisibility(true);
  $modelSelect.val(initialModelId);
};

function do_main_work(svgid) {
  var desc = save["details_target"].model;
  var node = desc.get_node_by_svg_id(svgid);
  var orignode = save["graph_adaptor"].illustrator
    .get_node_by_svg_id(svgid)
    .parents("g.element[element-id]");
  var origtype =
    orignode.attr("element-type") + "_" + orignode.attr("element-endpoint");

  var url = $("body").attr("current-instance");

  var nnew;
  if (svgid != save["details_target"].svgid) {
    let tn = desc.get_node_by_svg_id(svgid).get(0);
    let rng = desc.elements[$(tn).attr("svg-subtype")].clone();
    if (
      save["endpoints_cache"][$(tn).attr("endpoint")] &&
      save["endpoints_cache"][$(tn).attr("endpoint")].schema
    ) {
      let schema =
        save["endpoints_cache"][$(tn).attr("endpoint")].schema.documentElement;
      $(rng)
        .find(' > element[name="parameters"] > element[name="arguments"]')
        .replaceWith($(schema).clone());
    }
    if (
      save["endpoints_list"][$(tn).attr("endpoint")] &&
      (!save["endpoints_list"][$(tn).attr("endpoint")].startsWith("http") ||
        save["endpoints_list"][$(tn).attr("endpoint")].match(/^https?-/))
    ) {
      $(rng)
        .find(' > element[name="parameters"] > element[name="method"]')
        .remove();
    }
    let rngw = new RelaxNGui(rng, $("#relaxngworker"), desc.context_eval);
    nnew = $(rngw.save().documentElement);
  } else {
    save["details"].set_checkpoint();
    nnew = $(save["details"].save().documentElement);
  }
  nnew.attr("svg-id", svgid);

  if ($("*[svg-id]", node).length > 0) {
    nnew.append(
      node.children().filter(function () {
        return this.attributes["svg-id"] != undefined;
      }),
    );
  }

  if (node[0].namespaceURI == nnew.attr("xmlns")) {
    // remove xmlns when it is the same as in the parent node
    nnew[0].removeAttribute("xmlns");
  }

  // copy all elements from different namespaces
  [...node[0].attributes].forEach((attr) => {
    if (
      attr &&
      attr.namespaceURI &&
      attr.namespaceURI != "http://cpee.org/ns/description/1.0"
    ) {
      nnew[0].setAttributeNS(attr.namespaceURI, attr.nodeName, attr.nodeValue);
    }
  });

  node.replaceWith(nnew);

  var ttarget = manifestation.adaptor.illustrator.get_node_by_svg_id(svgid);
  var tnewnode = ttarget.parents("g.element[element-id]");
  var tnewtype =
    tnewnode.attr("element-type") + "_" + tnewnode.attr("element-endpoint");

  desc.refresh(function (graphrealization) {
    var vtarget = manifestation.adaptor.illustrator.get_node_by_svg_id(svgid);
    if (vtarget.length > 0) {
      vtarget.parents("g.element[element-id]").addClass("selected");
    }
    manifestation.adaptor.illustrator
      .get_label_by_svg_id(svgid)
      .addClass("selected");
    $("#graphgrid [element-id=" + svgid + "]").addClass("selected");

    var newnode = vtarget.parents("g.element[element-id]");
    var newtype =
      newnode.attr("element-type") + "_" + newnode.attr("element-endpoint");
    var g = graphrealization.get_description();
    //todo Bug here
    if (g) {
      save["graph"] = $X(g);
      save["graph"].removeAttr("svg-id");
      save["graph"].removeAttr("svg-type");
      save["graph"].removeAttr("svg-subtype");
      save["graph"].removeAttr("svg-label");
    }
    if (newtype != origtype) {
      manifestation.update_details(svgid);
      do_main_work(svgid);
    } else {
      saveActiveModel(MODEL_UPDATE_TYPE.MANUAL_UPDATE_GRAPH_PROPERTIES_ONLY);
      // $.ajax({
      //   type: "PUT",
      //   url: url + "/properties/description/",
      //   contentType: "text/xml",
      //   headers: {
      //     "Content-ID": "description",
      //     "CPEE-Event-Source": myid,
      //   },
      //   data: desc.get_description(),
      // });
      format_instance_pos();
      // document.dispatchEvent(graph_changed);
      ////////////////////////////
      // holy shit, f***in papercut. When blur/focusout from within relaxngui,
      // click on original target after graph was updated. tsvgid has to be
      // saved in mousedown because blur/focusout is between mousedown and click.
      ////////////////////////////
      if (save["details_target"].svgid != save["details_target"].tsvgid) {
        manifestation.adaptor.illustrator
          .get_label_by_svg_id(save["details_target"].tsvgid)
          .trigger("click");
      }
    }
  });
}
const setModelSelectVisibility = (isVisible) => {
  $(CALL_SUBPROCESS_MODEL_SELECT_SELECTOR)
    .parent()
    .toggleClass("hidden", !isVisible);
};
function syncCallEndpoint(typeValue) {
  const INPUT_SELECTOR = `#dat_details input[data-relaxngui-path=" > call[endpoint]"]`;
  $(INPUT_SELECTOR).val(typeValue === "subprocess" ? "subprocess" : "");
}
function syncCallSubprocessArguments(modelId) {
  const ARGUMENTS_SELECTOR = `#dat_details div[data-relaxngui-path=" > call > parameters > arguments[data-main]"]`;
  const BEHAVIOR_INPUT_SELECTOR = `${ARGUMENTS_SELECTOR} input[data-relaxngui-path=" > call > parameters > arguments > behavior"]`;
  const URL_INPUT_SELECTOR = `${ARGUMENTS_SELECTOR} input[data-relaxngui-path=" > call > parameters > arguments > url"]`;
  $(BEHAVIOR_INPUT_SELECTOR).val(modelId ? "wait_for_running" : "");
  $(URL_INPUT_SELECTOR).val(
    modelId ? window.location.origin + "/data/models/" + modelId + ".xml" : "",
  );
}
function getActiveCallTaskId() {
  const CALL_ID_INPUT_SELECTOR =
    '#dat_details input[data-relaxngui-path=" > call[id]"]';
  const taskIdFromInput = ($(CALL_ID_INPUT_SELECTOR).val() || "").toString().trim();
  if (taskIdFromInput) {
    return taskIdFromInput;
  }

  const taskIdFromDetailsTarget =
    save?.details_target?.svgid || save?.details_target?.tsvgid || "";
  return typeof taskIdFromDetailsTarget === "string"
    ? taskIdFromDetailsTarget.trim()
    : "";
}
function onCallClicked(e) {
  const $node = $(e.detail?.node);
  const endpoint = ($node.attr("endpoint") || "").trim();

  const isSubprocess = endpoint === "subprocess";
  // const $modelSelect = $(CALL_SUBPROCESS_MODEL_SELECT_SELECTOR);
  // $modelSelect.data("initial-model-value", modelId);
  if (isSubprocess) {
    const modelId = $node
      .children("parameters")
      .children("dbpm_subprocess_model")
      .text()
      .trim();
    renderModelSelect(modelId);
  } else {
    setModelSelectVisibility(false);
  }
}

function onCallTypeChange(typeValue) {
  syncCallEndpoint(typeValue);
  if (typeValue === "subprocess") {
    renderModelSelect();
    return;
  }
  syncCallSubprocessArguments("");
  modelService.updateSubprocessLink(getActiveCallTaskId(), null).catch((error) => {
    console.error("Failed to remove subprocess model link:", error);
  });
}

async function onCallSubprocessModelChange(modelId) {
  syncCallSubprocessArguments(modelId);
  try {
    await modelService.updateSubprocessLink(getActiveCallTaskId(), modelId);
  } catch (error) {
    console.error("Failed to bind subprocess model link:", error);
  }
}

createUI({
  setup: async () => {
    window.do_main_work = do_main_work;
    await endpointLoader.init();
    save["endpoints_cache"] = endpointLoader._cache;
    window.onDBPMCallTypeChange = onCallTypeChange;
    window.onDBPMCallSubprocessModelChange = onCallSubprocessModelChange;
    applyRegenerationActionBar(modelEditorStore.getLatestUpdateType());
  },
  bindListeners: () => {
    $graphGrid.parent().click(function (e) {
      $graphGrid.find(".selected").removeClass("selected");
      localStorage.removeItem("marked");
      localStorage.removeItem("marked_from");
      $datDetails.empty();
    });
    $viewPrevModelButton.on("click", () => {
      setRegenerationPreviewView("previous");
      applyRegenerationActionBar(modelEditorStore.getLatestUpdateType());
    });

    $viewNewModelButton.on("click", () => {
      setRegenerationPreviewView("regenerated");
      applyRegenerationActionBar(modelEditorStore.getLatestUpdateType());
    });

    $keepNewModelButton.on("click", async () => {
      const preview = regenerationPreviewState;
      if (!preview) {
        return;
      }
      if (preview.view !== "regenerated") {
        setRegenerationPreviewView("regenerated");
      }
      try {
        await modelService.updateEditingVersion(preview.updateType);
        modelEditorStore.setLatestUpdateType(null);
        regenerationPreviewState = null;
      } catch (error) {
        console.error("Failed to keep regenerated model:", error);
        alert("Failed to keep regenerated model.");
      }
    });

    $revertPrevModelButton.on("click", () => {
      const preview = regenerationPreviewState;
      if (!preview?.previousDataXml) {
        modelEditorStore.setLatestUpdateType(null);
        regenerationPreviewState = null;
        return;
      }
      isApplyingRegenerationView = true;
      modelEditorStore.setData(preview.previousDataXml);
      isApplyingRegenerationView = false;
      modelEditorStore.setLatestUpdateType(null);
      regenerationPreviewState = null;
    });

    $(document).on("wf:call-clicked", onCallClicked);
    $(document).on("wf:subprocess-dblclicked", function (e) {
      console.log(`Event Listener 'wf:subprocess-dblclicked' listened`);
      const $node = $(e.detail.node);
      const modelId = $node
        .children("parameters")
        .children("dbpm_subprocess_model")
        .text();
      if (modelId) {
        workspaceService.toggleModelDisplay(modelId);
      }
    });
    $(document).on("wf:subprocess-hovered", function (e) {
      const $node = $(e.detail.node);
      const modelId = $node
        .children("parameters")
        .children("dbpm_subprocess_model")
        .text();
      const versionId = modelsStore.getLatestVersionId(modelId) || null;
      const svgId = $node.attr("id");
      const $element = $(`#graphcanvas [element-id="${svgId}"]`);

      // ✨ NEW: Pass source identifier to prevent conflicts
      workspaceStore.setModelPopoverParams(
        {
          modelId,
          versionId,
          anchor: { type: "element", element: $element[0] },
        },
        "subprocess-node",
      ); // ✨ NEW: Source tracking for conflict prevention

      /* OLD CODE - No source tracking:
    workspaceStore.setModelPopoverParams({
      modelId,
      anchor: { type: "element", element: $element[0] },
    });
    */

      console.log("Subprocess modelId:", modelId);
      // const modelName = modelsStore.getModelNameById(modelId); // OLD: Commented out unused code
      // const modelGraph = $(modelsStore.getModelGraphById(modelId)).clone();
      // const modelId = $node
      //   .children("parameters")
      //   .children("dbpm_subprocess_model")
      //   .text();
      // const modelName = modelsStore.getModelNameById(modelId);
      // const modelGraph = $(modelsStore.getModelGraphById(modelId)).clone();
    });
    $(document).on("wf:subprocess-unhovered", function (e) {
      console.log(`Event Listener 'wf:subprocess-unhovered' listened`);
      // ✨ NEW: Pass source identifier to ensure only the same source can close
      workspaceStore.requestCloseModelPopover("subprocess-node");

      /* OLD CODE - No source tracking:
    workspaceStore.requestCloseModelPopover();
    */
    });
  },
  subscribeStores: () => {
    modelEditorStore.subscribe((state, { key, oldValue, newValue }) => {
      switch (key) {
        case "data": {
          if (!isApplyingRegenerationView) {
            const updateType = modelEditorStore.getLatestUpdateType();
            if (
              isRegenerationUpdateType(updateType) &&
              oldValue &&
              newValue
            ) {
              const previousDataXml = serializeXmlNode(oldValue);
              const regeneratedDataXml = serializeXmlNode(newValue);
              if (previousDataXml && regeneratedDataXml) {
                regenerationPreviewState = {
                  updateType,
                  previousDataXml,
                  regeneratedDataXml,
                  view: "regenerated",
                };
              }
            } else if (!isRegenerationUpdateType(updateType)) {
              regenerationPreviewState = null;
            }
          }

          if (newValue) {
            showWFGraph(newValue);
          } else {
            clearModelEditor();
          }

          applyRegenerationActionBar(modelEditorStore.getLatestUpdateType());
          break;
        }
        case "latestUpdateType":
          if (!isRegenerationUpdateType(newValue)) {
            regenerationPreviewState = null;
          }
          applyRegenerationActionBar(newValue);
          break;
        default:
          break;
      }
    });

    workspaceStore.subscribe((state, { key, oldValue, newValue }) => {
      switch (key) {
        case "editingModel": {
          if (!newValue.id) {
            clearModelEditor();
            regenerationPreviewState = null;
            applyRegenerationActionBar(modelEditorStore.getLatestUpdateType());
          }
          break;
        }
        default:
          break;
      }
    });
  },
});

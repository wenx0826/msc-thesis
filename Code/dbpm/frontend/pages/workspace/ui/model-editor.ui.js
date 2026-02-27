import { createUI } from "../../../shared/utils/ui.js";
import {
  modelEditorStore,
  documentsStore,
  modelsStore,
  workspaceStore,
} from "../store/index.js";
import { modelService, workspaceService } from "../services/index.js";
import { endpointLoader } from "../workflow/wf_endpoints/endpoint-loader.js";
import { Constants } from "../../../constants.js";
import { default as setModelNameEditor } from "../../../shared/widgets/inline-editor.js";
import initVersionSelector from "../../../shared/widgets/version-selector.js";

const MODEL_UPDATE_TYPE = Constants.MODEL_UPDATE_TYPE;
// Header bar
const $editingModelVersionName = $("#editingModelVersionName");
const $versionSelect = $("#modelVersionSelect");
const $createVersionButton = $("#createModelVersionButton");
const $exportTestsetButton = $("#exportTestsetButton");
// Graph and details
const $deleteModelButton = $("#deleteModelButton");
const $datDetails = $("#dat_details");
// Action bars and buttons
// Prompt editor
const $promptInput = $("#promptInput");
const $promptContainer = $("#promptContainer");
const $promptActionBar = $("#promptActionBar");
const $sendPromptButton = $("#sendPromptButton");
const $clearPromptButton = $("#clearPromptButton");

const $modelActionBar = $("#modelActionBar");

const $regeneratedModelActionBar = $("#regeneratedModelActionBar");
const $viewPrevModelButton = $("#viewPrevModelButton");
const $viewNewModelButton = $("#viewNewModelButton");
const $revertPrevModelButton = $("#revertPrevModelButton");
const $keepNewModelButton = $("#keepNewModelButton");

const $viewModelDataLink = $("#viewModelDataLink");
const CALL_TYPE_SELECTOR = `#dat_details select[data-relaxngui-path=" > call > parameters > dbpm_type"]`;
const CALL_SUBPROCESS_MODEL_SELECTOR = `#dat_details select[data-relaxngui-path=" > call > parameters > dbpm_subprocess_model"]`;

function syncActiveModelGraphInList() {
  var gc = $("#graphcanvas").clone();
  var start = parseInt(gc.attr("width"));
  $("#graphgrid > svg:not(#graphcanvas)").each((i, ele) => {
    const gr = $X(
      '<g transform="translate(' +
        start +
        ')" xmlns="http://www.w3.org/2000/svg"></g>',
    );
    start = start + parseInt(ele.getAttribute("width"));
    $("g", ele).each((j, g) => {
      gr.append($(g).clone());
    });
    gc.append(gr);
  });
  gc.find(".selected").removeClass("selected");
  var varreps = {};
  $(window.document.styleSheets).each(function (i, x) {
    if (
      x &&
      x.href &&
      x.ownerNode.attributes.getNamedItem("data-include-export")
    ) {
      $(x.cssRules).each(function (j, y) {
        if (y.selectorText == ":root") {
          $(y.style).each(function (k, z) {
            varreps["var\\(" + z + "\\)"] = getComputedStyle(
              document.documentElement,
            )
              .getPropertyValue(z)
              .toString();
          });
        }
        var loc = $(gc).find(y.selectorText.replace(/svg /g, ""));
        var cst = y.style.cssText;
        for (k in varreps) {
          cst = cst.replace(new RegExp(k, "g"), varreps[k]);
        }
        loc.each(function (k, loco) {
          var sty =
            $(loco).attr("style") == undefined ? "" : $(loco).attr("style");
          $(loco).attr("style", cst + sty);
        });
      });
      var loc = $(gc).find("text.super");
      loc.attr("style", loc.attr("style") + " display: none; ");
    }
  });
  gc.attr("width", start + 1);
  gc.find(".duration");
  gc.removeAttr("id");
  modelsStore.updateModelById(workspaceStore.getEditingModelId(), {
    svg: gc[0].outerHTML,
  });
}

function saveActiveModel(type) {
  modelService.updateActiveModel(type);
  syncActiveModelGraphInList();
}

function clearModelViewer() {
  $editingModelVersionName.text("");
  $modelActionBar.prop("disabled", true);
  setCreateVersionButton(true);
  $("#graphcanvas").empty();
  $datDetails.empty();
  $promptContainer.hide();
}

function clearModelEditor() {
  $editingModelVersionName.text("");
  $modelActionBar.prop("disabled", true);
  setCreateVersionButton(true);
  $("#graphcanvas").empty();
  $datDetails.empty();
  $promptContainer.hide();
}

function setCreateVersionButton(isSelectedVersionLatest) {
  const shouldCreateNewVersion = isSelectedVersionLatest !== false;
  if (shouldCreateNewVersion) {
    $createVersionButton
      .text("+ New version")
      .attr("title", "Create a version from the current latest version")
      .attr("data-action", "new_version");
    return;
  }
  $createVersionButton
    .text("Revert to this version")
    .attr("title", "Create a new version by copying this selected version")
    .attr("data-action", "revert");
}

function syncCreateVersionButtonState() {
  const { id: modelId, versionId: sourceVersionId } =
    workspaceStore.getEditingModel() || {};
  if (!modelId || !sourceVersionId) {
    setCreateVersionButton(true);
    return;
  }
  setCreateVersionButton(modelsStore.isLatestVersion(modelId, sourceVersionId));
}

async function showWFGraph(data) {
  save["state"] = "ready";
  save["graph_theme"] = "preset_customized";
  // console.log("!!!!!!!!!!! Showing active model:", model);
  // Initialize endpoints and map to save cache for details.js compatibility - WAIT for completion
  await endpointLoader.init();
  save["endpoints_cache"] = endpointLoader._cache;
  save["graph_adaptor"] = new WfAdaptor(
    "pages/workspace/workflow/wf_themes/preset_customized/theme.js",
    function (graphrealization) {
      graphrealization.illustrator.get_symbol = endpointLoader._boundGetSymbol;
      graphrealization.illustrator.get_properties =
        endpointLoader._boundGetProperties;
      graphrealization.set_svg_container($("#graphcanvas"));
      graphrealization.set_label_container($("#graphgrid"));
      graphrealization.set_description($(data), true);
      graphrealization.notify = function (svgid) {
        console.log("Graph realization notify for svgid:", svgid);
        var g = graphrealization.get_description();
        manifestation.events.click(svgid);
        format_instance_pos();
        if (manifestation.selected() == "unknown") {
          $("#dat_details").empty();
        }
        console.log(
          "Graph realization notify!! - saving active model with updated graph",
        );
        modelService.saveModel(MODEL_UPDATE_TYPE.MANUAL_UPDATE_GRAPH_CHANGED);
        // saveActiveModel(MODEL_UPDATE_TYPE.MANUAL_UPDATE_GRAPH_CHANGED);
      };
    },
  );
}

const showActiveModel = async (model) => {
  save["state"] = "ready";
  save["graph_theme"] = "preset_customized";
  // Initialize endpoints and map to save cache for details.js compatibility - WAIT for completion
  await endpointLoader.init();
  save["endpoints_cache"] = endpointLoader._cache;
  save["graph_adaptor"] = new WfAdaptor(
    "pages/workspace/workflow/wf_themes/preset_customized/theme.js",
    function (graphrealization) {
      graphrealization.illustrator.get_symbol = endpointLoader._boundGetSymbol;
      graphrealization.illustrator.get_properties =
        endpointLoader._boundGetProperties;
      graphrealization.set_svg_container($("#graphcanvas"));
      graphrealization.set_label_container($("#graphgrid"));
      graphrealization.set_description($(model.data), true);
      graphrealization.notify = function (svgid) {
        console.log("Graph realization notify for svgid:", svgid);
        console.log("Saving model 111");

        var g = graphrealization.get_description();
        manifestation.events.click(svgid);
        format_instance_pos();
        if (manifestation.selected() == "unknown") {
          $("#dat_details").empty();
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

const setModelSelectVisibility = ($modelSelect, isVisible) => {
  const $container = getModelSelectContainer($modelSelect);
  if ($container.length === 0) {
    return;
  }
  if (isVisible) {
    $container.show();
  } else {
    $container.hide();
  }
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

const renderModelSelect = (modelValue) => {
  const $modelSelect = $(CALL_SUBPROCESS_MODEL_SELECTOR);
  if ($modelSelect.length === 0) {
    return;
  }
  const editingModelId = modelEditorStore.getModelId();
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
  setModelSelectVisibility($modelSelect, true);
  $modelSelect.val(modelValue || "");
};

function do_main_work(svgid) {
  //{{{
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

  const endpoint = nnew.attr("endpoint");
  const nnewArguments = nnew.children("parameters").children("arguments");
  const nnewArgBehavior = nnewArguments.children("behavior");
  const nnewArgUrl = nnewArguments.children("url");
  const nnDbpmSubprocessModel = nnew
    .children("parameters")
    .children("dbpm_subprocess_model");
  if (endpoint === "subprocess") {
    var subprocessModelId = nnew
      .children("parameters")
      .children("dbpm_subprocess_model")
      .text();
    if (subprocessModelId) {
      nnewArgBehavior.text("wait_for_running");
      nnewArgUrl.text(
        window.location.origin + "/data/models/" + subprocessModelId + ".xml",
      );
    } else {
      nnewArguments.remove();
    }
  } else {
    nnDbpmSubprocessModel.remove();
    nnewArguments.remove();
  }

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
    console.log("????? g=", g);

    // WORKAROUND: get_description() fails due to nodeType issue in wfadaptor
    // Use direct serialization instead
    // if (!g) {
    //   console.warn(
    //     "get_description() returned null, using direct serialization workaround",
    //   );
    //   try {
    //     var descRoot = desc.get_node_by_svg_id("description");
    //     if (descRoot && descRoot.length > 0) {
    //       // Clone and remove svg attributes
    //       var serxml = descRoot.clone(true);
    //       serxml.removeAttr("svg-id");
    //       serxml.removeAttr("svg-type");
    //       serxml.removeAttr("svg-subtype");
    //       serxml.removeAttr("svg-label");
    //       $("*[svg-id]", serxml).each(function () {
    //         $(this).removeAttr("svg-id");
    //         $(this).removeAttr("svg-type");
    //         $(this).removeAttr("svg-subtype");
    //         $(this).removeAttr("svg-label");
    //       });
    //       g = serxml.serializeXML();
    //       console.log(
    //         "Direct serialization workaround SUCCEEDED, g=",
    //         g ? g.substring(0, 200) + "..." : "NULL",
    //       );
    //     }
    //   } catch (e) {
    //     console.error("Direct serialization workaround FAILED:", e);
    //   }
    // }

    if (g) {
      save["graph"] = $X(g);
      save["graph"].removeAttr("svg-id");
      save["graph"].removeAttr("svg-type");
      save["graph"].removeAttr("svg-subtype");
      save["graph"].removeAttr("svg-label");

      console.log(
        "save['graph'] after cleaning:",
        save["graph"].serializePrettyXML
          ? save["graph"].serializePrettyXML().substring(0, 500)
          : new XMLSerializer()
              .serializeToString(save["graph"][0])
              .substring(0, 500),
      );
    } else {
      console.error(
        "get_description() returned null - description may be invalid",
      );
    }

    console.log("herer???", newtype, origtype);
    if (newtype != origtype) {
      // console.log("herer???", newtype, origtype);
      manifestation.update_details(svgid);
      do_main_work(svgid);
    } else {
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
      // format_instance_pos();

      // document.dispatchEvent(graph_changed);

      ////////////////////////////
      // holy shit, f***in papercut. When blur/focusout from within relaxngui,
      // click on original target after graph was updated. tsvgid has to be
      // saved in mousedown because blur/focusout is between mousedown and click.
      ////////////////////////////
      if (save["details_target"].svgid != save["details_target"].tsvgid) {
        console.log(">>>???????????? here triggered?");
        manifestation.adaptor.illustrator
          .get_label_by_svg_id(save["details_target"].tsvgid)
          .trigger("click");
      }

      console.log(
        "333333333_ Details Save: node=",
        node,
        "endpoint=",
        node.attr("endpoint"),
        node.children("parameters").children("dbpm_type").text(),
      );

      // Update the active model store with the cleaned graph
      if (save["graph"]) {
        console.log("Updating activeModel store with cleaned graph");
        Store.activeModel.state.model.data = save["graph"][0];
        console.log("Store updated. Verifying...");
        const storeData = Store.activeModel.getSerializedData();
        console.log(
          "Store serialized data (first 500 chars):",
          storeData.substring(0, 500),
        );
      }

      // manifestation.adaptor.illustrator
      //   .get_label_by_svg_id(save["details_target"].tsvgid)
      //   .trigger("click");
      saveActiveModel(MODEL_UPDATE_TYPE.MANUAL_UPDATE_GRAPH_PROPERTIES_ONLY);
    }
  });
}

createUI({
  setup: () => {
    window.do_main_work = do_main_work;
    setCreateVersionButton(true);
    setModelNameEditor({
      $scope: $editingModelVersionName.parent(),
      trigger: "click",
      autoGrow: true,
      onSave: (name) => {
        const editingModelId = workspaceStore.getEditingModelId();
        modelService.renameModel(editingModelId, name);
      },
    });
    const versionSelector = initVersionSelector({
      $select: $versionSelect,
      onSelect: ({ version }) => {
        workspaceService.toggleModelDisplay(version.modelId, version.id);
      },
    });
    return { versionSelector };
  },
  bindListeners: () => {
    $createVersionButton.on("click", async () => {
      const { id: modelId, versionId: sourceVersionId } =
        workspaceStore.getEditingModel() || {};
      if (!modelId || !sourceVersionId) {
        alert("No model version is currently selected.");
        return;
      }

      $createVersionButton.prop("disabled", true);
      try {
        const result = await modelService.createModelVersion(
          modelId,
          sourceVersionId,
        );
        if (result?.meta?.reason === "revert") {
          console.log(
            `Created new version by reverting from ${result.meta.sourceVersionLabel}`,
          );
        }
      } catch (error) {
        console.error("Failed to create model version:", error);
        alert("Failed to create model version.");
      } finally {
        $createVersionButton.prop("disabled", false);
        syncCreateVersionButtonState();
      }
    });
    $viewModelDataLink.on("click", (e) => {
      e.preventDefault();
      window.open(
        "/data/models/" + workspaceStore.getEditingModelId() + ".xml",
        "_blank",
      );
    });

    $exportTestsetButton.on("click", (e) => {
      e.preventDefault();
      const filename = "testset_" + workspaceStore.getEditingModelId() + ".xml";
      const text =
        '<?xml version="1.0"?>\n<testset xmlns="http://cpee.org/ns/properties/2.0">\n<executionhandler>ruby</executionhandler>\n<dataelements/>\n<endpoints/>\n<attributes>\n<guarded>none</guarded>\n<modeltype>CPEE</modeltype>\n<theme>preset</theme>\n<guarded_id/>\n<info>Subprocess</info>\n<creator>Christine Ashcreek</creator>\n<author>Christine Ashcreek</author>\n<model_uuid>1fc43528-3e4a-40ee-8503-c0ed7e5d883c</model_uuid>\n<model_version/>\n<design_stage>development</design_stage>\n<design_dir>Templates.dir</design_dir>\n</attributes>\n<description>' +
        modelEditorStore.getSerializedRpstData() +
        "\n</description>\n</testset>";
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
    });

    $deleteModelButton.on("click", () => {
      modelService.deleteModel(workspaceStore.getEditingModelId());
    });

    $keepNewModelButton.on("click", async () => {
      $regeneratedModelActionBar.hide();
      modelService.updateActiveModel();
      syncActiveModelGraphInList();
    });

    $revertPrevModelButton.on("click", () => {
      $editingModelVersionName.text("");
      $("#graphcanvas").empty();
      $("#generatedModelActionBar").css("visibility", "hidden");
    });

    $("#activeModelContainer").click(function (e) {
      $("#graphgrid .selected").removeClass("selected");
      localStorage.removeItem("marked");
      localStorage.removeItem("marked_from");
      $("#dat_details").empty();
    });

    $promptInput.on("input", () => {
      const promptText = $promptInput.text();
      if (promptText && promptText.trim() !== "") {
        $promptActionBar.removeAttr("disabled");
      } else {
        $promptActionBar.attr("disabled", "disabled");
      }
    });

    $clearPromptButton.on("mousedown", (e) => {
      e.preventDefault();
      console.log("Clearing prompt input");
      $promptInput.empty();
      $promptActionBar.attr("disabled", "disabled");
    });

    $sendPromptButton.on("click", () => {
      const promptText = $promptInput.text();
      if (!promptText || promptText.trim() === "") {
        alert("Please enter a prompt.");
        return;
      }
      $promptInput.empty();
      $promptActionBar.attr("disabled", "disabled");
      modelService.generateModelByPrompt(promptText);
    });
    $(document)
      .off("change.call-type", CALL_TYPE_SELECTOR)
      .on("change.call-type", CALL_TYPE_SELECTOR, function () {
        const $endpointInput = $(
          `#dat_details input[data-relaxngui-path=" > call[endpoint]"]`,
        );
        const $modelSelect = $(CALL_SUBPROCESS_MODEL_SELECTOR);
        const initialModelValue =
          $modelSelect.data("initial-model-value") || "";
        const typeValue = $(this).val();
        if (typeValue === "subprocess") {
          if ($endpointInput.length > 0) {
            $endpointInput.val("subprocess");
          }
          renderModelSelect($modelSelect.val() || initialModelValue);
          return;
        }
        if ($endpointInput.length > 0) {
          $endpointInput.val("");
        }
        $modelSelect.val("");
        setModelSelectVisibility($modelSelect, false);
      });
    $(document).on("wf:call-clicked", function (e) {
      console.log(`Event Listener 'wf:call-clicked' listened`);
      const nodeData = e.detail?.node || e.detail?.nn;
      if (!nodeData) {
        return;
      }
      const $node = $(nodeData);
      const endpoint = ($node.attr("endpoint") || "").trim();
      const type = $node
        .children("parameters")
        .children("dbpm_type")
        .text()
        .trim();
      const $argumentsDiv = $(
        `#dat_details div[data-relaxngui-path=" > call > parameters > arguments[data-main]"]`,
      );
      $argumentsDiv.css({ visibility: "hidden", height: "0px" });
      const modelValue = $node
        .children("parameters")
        .children("dbpm_subprocess_model")
        .text()
        .trim();

      const $endpointInput = $(
        `#dat_details input[data-relaxngui-path=" > call[endpoint]"]`,
      );
      // if ($endpointInput.length > 0) {
      //   $endpointInput.parent().css({ visibility: "hidden", height: "0px" });
      // }
      const isSubprocess = endpoint === "subprocess" || type === "subprocess";
      const $typeSelect = $(CALL_TYPE_SELECTOR);
      $typeSelect.val(isSubprocess ? "subprocess" : "task");
      const $modelSelect = $(CALL_SUBPROCESS_MODEL_SELECTOR);
      $modelSelect.data("initial-model-value", modelValue);
      if (isSubprocess) {
        if ($endpointInput.length > 0) {
          $endpointInput.val("subprocess");
        }
        renderModelSelect(modelValue);
      } else {
        if ($endpointInput.length > 0) {
          $endpointInput.val("");
        }
        $modelSelect.val("");
        setModelSelectVisibility($modelSelect, false);
      }
    });
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
      console.log(`Event Listener 'wf:subprocess-hovered' listened`);
      const $node = $(e.detail.node);
      const modelId = $node
        .children("parameters")
        .children("dbpm_subprocess_model")
        .text();
      const svgId = $node.attr("id");
      const $element = $(`#graphcanvas [element-id="${svgId}"]`);
      console.log("Hovered subprocess svgId:", svgId, "modelId:", modelId);

      // ✨ NEW: Pass source identifier to prevent conflicts
      workspaceStore.setModelPopoverParams(
        {
          modelId,
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
  subscribeStores: ({ versionSelector }) => {
    modelEditorStore.subscribe((state, { key, oldValue, newValue }) => {
      switch (key) {
        case "data":
          if (newValue) {
            showWFGraph(newValue);
            $promptContainer.show();
          } else {
            clearModelEditor();
          }
          break;
        // case "model":
        //   if (newValue) {
        //     $editingModelVersionName.text(newValue.name ? newValue.name : "");
        //     $modelActionBar.prop("disabled", false);
        //     $datDetails.empty();
        //     showActiveModel(newValue);
        //     const newModelId = newValue.id;
        //     if (newModelId) {
        //       $promptContainer.show();
        //     }
        //     const modelUpdateType = newValue.updateType;
        //     if (
        //       [
        //         MODEL_UPDATE_TYPE.REGENERATION_BY_PROMPT,
        //         MODEL_UPDATE_TYPE.REGENERATION_BY_SELECTIONS,
        //       ].includes(modelUpdateType)
        //     ) {
        //       $viewPrevModelButton.prop("disabled", false);
        //       $viewNewModelButton.prop("disabled", true);
        //       $revertPrevModelButton.prop("disabled", true);
        //       $keepNewModelButton.prop("disabled", false);
        //       $regeneratedModelActionBar.show();
        //       $viewPrevModelButton.on("click", () => {
        //         showActiveModel(oldValue);
        //         $viewPrevModelButton.prop("disabled", true);
        //         $viewNewModelButton.prop("disabled", false);
        //         $revertPrevModelButton.prop("disabled", false);
        //         $keepNewModelButton.prop("disabled", true);
        //       });
        //       $viewNewModelButton.on("click", () => {
        //         showActiveModel(newValue);
        //         $viewPrevModelButton.prop("disabled", false);
        //         $viewNewModelButton.prop("disabled", true);
        //         $revertPrevModelButton.prop("disabled", true);
        //         $keepNewModelButton.prop("disabled", false);
        //       });
        //       $revertPrevModelButton.on("click", () => {
        //         showActiveModel(oldValue);
        //         $regeneratedModelActionBar.hide();
        //       });
        //     }
        //   } else {
        //     clearModelViewer();
        //   }
        //   break;
        default:
          break;
      }
    });

    modelsStore.subscribe((state, { key, operation }) => {
      if (key !== "entitiesById.versions" || operation !== "add") {
        return;
      }
      syncCreateVersionButtonState();
    });

    workspaceStore.subscribe(async (state, { key, oldValue, newValue }) => {
      switch (key) {
        case "editingModel":
          const { id: newModelId, versionId: newVersionId } = newValue || {};
          const { id: oldModelId, versionId: oldVersionId } = oldValue || {};
          if (newModelId) {
            const modelMeta = modelsStore.getEntity(newModelId);
            if (newModelId !== oldModelId)
              $editingModelVersionName.text(modelMeta?.name || "");
            if (newVersionId !== oldVersionId)
              versionSelector.update({
                versions: modelMeta?.versions || [],
                selectedId: newVersionId,
              });
            syncCreateVersionButtonState();
          } else {
            clearModelEditor();
          }
          break;
        default:
          break;
      }
    });
  },
});

// Active Model UI Module
import {
  activeModelStore,
  modelsStore,
  workspaceStore,
} from "../store/index.js";
import { modelService } from "../services/index.js";
import { endpointAPI } from "../../api/index.js";

const MODEL_UPDATE_TYPE = window.Constants?.MODEL_UPDATE_TYPE;

const $modelActionBar = $("#modelActionBar");
const $exportTestsetButton = $("#exportTestsetButton");
const $deleteModelButton = $("#deleteModelButton");
const $datDetails = $("#dat_details");
const $regeneratedModelActionBar = $("#regeneratedModelActionBar");
const $viewPrevModelButton = $("#viewPrevModelButton");
const $viewNewModelButton = $("#viewNewModelButton");
const $revertPrevModelButton = $("#revertPrevModelButton");
const $keepNewModelButton = $("#keepNewModelButton");
const $promptInput = $("#promptInput");
const $promptContainer = $("#promptContainer");
const $promptActionBar = $("#promptActionBar");
const $sendPromptButton = $("#sendPromptButton");
const $clearPromptButton = $("#clearPromptButton");
const $viewModelDataLink = $("#viewModelDataLink");

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

  modelsStore.updateModelById(workspaceStore.getActiveModelId(), {
    svg: gc[0].outerHTML,
  });
}

function saveActiveModel(type) {
  modelService.updateActiveModel(type);
  syncActiveModelGraphInList();
}

function clearModelViewer() {
  $("#activeModelName").text("");
  $modelActionBar.prop("disabled", true);
  $("#graphcanvas").empty();
  $datDetails.empty();
  $promptContainer.hide();
}

const showActiveModel = async (model) => {
  save["state"] = "ready";
  save["graph_theme"] = "preset_copy";

  // Initialize endpoints and map to save cache for details.js compatibility
  endpointAPI.init();
  save["endpoints_cache"] = endpointAPI._cache;

  save["graph_adaptor"] = new WfAdaptor(
    "./wf_graph_themes/preset_copy/theme.js",
    function (graphrealization) {
      graphrealization.illustrator.get_symbol =
        endpointAPI.getSymbol.bind(endpointAPI);
      graphrealization.illustrator.get_properties =
        endpointAPI.getProperties.bind(endpointAPI);
      graphrealization.set_svg_container($("#graphcanvas"));
      graphrealization.set_label_container($("#graphgrid"));
      graphrealization.set_description($(model.data), true);
      graphrealization.notify = function (svgid) {
        console.log("Graph realization notify for svgid:", svgid);
        var g = graphrealization.get_description();
        manifestation.events.click(svgid);
        format_instance_pos();
        if (manifestation.selected() == "unknown") {
          $("#dat_details").empty();
        }
        saveActiveModel(MODEL_UPDATE_TYPE.MANUAL_UPDATE_GRAPH_CHANGED);
      };
    },
  );
};

export function initActiveModelUI() {
  // Initialize DOM references

  // Set up event handlers
  $viewModelDataLink.on("click", (e) => {
    e.preventDefault();
    window.open(
      "/data/models/" + workspaceStore.getActiveModelId() + ".xml",
      "_blank",
    );
  });

  $exportTestsetButton.on("click", (e) => {
    e.preventDefault();
    const filename = "testset_" + workspaceStore.getActiveModelId() + ".xml";
    const text =
      '<?xml version="1.0"?>\n<testset xmlns="http://cpee.org/ns/properties/2.0">\n<executionhandler>ruby</executionhandler>\n<dataelements/>\n<endpoints/>\n<attributes>\n<guarded>none</guarded>\n<modeltype>CPEE</modeltype>\n<theme>preset</theme>\n<guarded_id/>\n<info>Subprocess</info>\n<creator>Christine Ashcreek</creator>\n<author>Christine Ashcreek</author>\n<model_uuid>1fc43528-3e4a-40ee-8503-c0ed7e5d883c</model_uuid>\n<model_version/>\n<design_stage>development</design_stage>\n<design_dir>Templates.dir</design_dir>\n</attributes>\n<description>' +
      activeModelStore.getSerializedRpstData() +
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
    modelService.deleteModel(workspaceStore.getActiveModelId());
  });

  $keepNewModelButton.on("click", async () => {
    $regeneratedModelActionBar.hide();
    modelService.updateActiveModel();
    syncActiveModelGraphInList();
  });

  $revertPrevModelButton.on("click", () => {
    $("#activeModelName").text("");
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

  // Subscribe to store changes
  activeModelStore.subscribe((state, { key, oldValue, newValue }) => {
    switch (key) {
      case "model":
        if (newValue) {
          $("#activeModelName").text(newValue.name ? newValue.name : "");
          $modelActionBar.prop("disabled", false);
          $datDetails.empty();
          showActiveModel(newValue);
          const newModelId = newValue.id;
          if (newModelId) {
            $promptContainer.show();
          }
          const modelUpdateType = newValue.updateType;
          if (
            [
              MODEL_UPDATE_TYPE.REGENERATION_BY_PROMPT,
              MODEL_UPDATE_TYPE.REGENERATION_BY_SELECTIONS,
            ].includes(modelUpdateType)
          ) {
            $viewPrevModelButton.prop("disabled", false);
            $viewNewModelButton.prop("disabled", true);
            $revertPrevModelButton.prop("disabled", true);
            $keepNewModelButton.prop("disabled", false);
            $regeneratedModelActionBar.show();
            $viewPrevModelButton.on("click", () => {
              showActiveModel(oldValue);
              $viewPrevModelButton.prop("disabled", true);
              $viewNewModelButton.prop("disabled", false);
              $revertPrevModelButton.prop("disabled", false);
              $keepNewModelButton.prop("disabled", true);
            });
            $viewNewModelButton.on("click", () => {
              showActiveModel(newValue);
              $viewPrevModelButton.prop("disabled", false);
              $viewNewModelButton.prop("disabled", true);
              $revertPrevModelButton.prop("disabled", true);
              $keepNewModelButton.prop("disabled", false);
            });
            $revertPrevModelButton.on("click", () => {
              showActiveModel(oldValue);
              $regeneratedModelActionBar.hide();
            });
          }
        } else {
          clearModelViewer();
        }
        break;
      default:
        break;
    }
  });

  workspaceStore.subscribe(async (state, { key, oldValue, newValue }) => {
    switch (key) {
      case "activeModelId":
        break;
      default:
        break;
    }
  });

  console.log("Active Model UI initialized");
}

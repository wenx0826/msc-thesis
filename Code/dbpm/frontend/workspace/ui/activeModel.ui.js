// Active Model UI Module
import {
  activeModelStore,
  documentsStore,
  modelsStore,
  workspaceStore,
} from "../store/index.js";
import { modelService } from "../services/index.js";
import { endpointAPI } from "../../api/index.js";
import { Constants } from "../../constants.js";

const MODEL_UPDATE_TYPE = Constants.MODEL_UPDATE_TYPE;

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
  save["graph_theme"] = "preset_customized";

  // Initialize endpoints and map to save cache for details.js compatibility
  endpointAPI.init();
  save["endpoints_cache"] = endpointAPI._cache;

  save["graph_adaptor"] = new WfAdaptor(
    "./wf_graph_themes/preset_customized/theme.js",
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

const renderModelSelect = (modelValue) => {
  const activeModelId = activeModelStore.getModelId();
  const $modelSelect = $(
    `#dat_details select[data-relaxngui-path=" > call > parameters > dbpm_subprocess_model"]`,
  );
  $modelSelect.parent().parent().show();
  $modelSelect.empty();
  $("<option>").val("").text("--- Please select ---").appendTo($modelSelect);
  const documentList = documentsStore.getDocuments();
  console.log("Document List:", documentList);
  for (const { id: docId, name: docName } of documentList) {
    const $optGroup = $("<optgroup>")
      .attr("label", docName)
      .appendTo($modelSelect);
    const models = modelsStore
      .getModels()
      .filter((m) => m.documentId === docId);
    for (const { meta } of models) {
      const { id: modelId, name: modelName } = meta;
      const $option = $("<option>")
        .val(modelId)
        .text(modelName)
        .appendTo($optGroup);
      if (modelId == modelValue) $option.prop("selected", true);
      if (modelId == activeModelId) $option.prop("disabled", true);
    }
  }
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
  $(document).on("wf:call-clicked", function (e) {
    console.log(`Event Listener 'wf:call-clicked' listened`);
    const nn = e.detail.nn;
    const svgid = save["details_target"].svgid;
    const model = save["details_target"].model;
    const tagName = nn.prop("tagName");
    const endpoint = nn.attr("endpoint");
    const $argumentsDiv = $(
      `#dat_details div[data-relaxngui-path=" > call > parameters > arguments[data-main]"]`,
    );
    $argumentsDiv.css({ visibility: "hidden", height: "0px" });
    const typeValue = nn.children("parameters").children("dbpm_type").text();
    const modelValue = nn
      .children("parameters")
      .children("dbpm_subprocess_model")
      .text();
    const $idInput = $(`#dat_details input[data-relaxngui-path=" > call[id]"`);
    if ($idInput.length > 0) {
      $idInput.parent().css({ visibility: "hidden", height: "0px" });
    }
    const $endpointInput = $(
      `#dat_details input[data-relaxngui-path=" > call[endpoint]"]`,
    );
    if ($endpointInput.length > 0) {
      $endpointInput.parent().css({ visibility: "hidden", height: "0px" });
    }
    const isSubprocess = endpoint === "subprocess" ? true : false;
    const $typeSeclect = $(
      `#dat_details select[data-relaxngui-path=" > call > parameters > dbpm_type"]`,
    );
    $typeSeclect.val(isSubprocess ? "subprocess" : "task");
    const $modelSelect = $(
      `#dat_details select[data-relaxngui-path=" > call > parameters > dbpm_subprocess_model"]`,
    );
    $typeSeclect.on("change", function (e) {
      const typeValue = $(this).val();
      if (typeValue == "subprocess") {
        if ($endpointInput.length > 0) {
          $endpointInput.val("subprocess");
        }
        renderModelSelect(modelValue);
      } else {
        if ($endpointInput.length > 0) {
          $endpointInput.val("");
        }
        $modelSelect.val("");
        $modelSelect.parent().parent().hide();
      }
    });
    if (isSubprocess) {
      renderModelSelect(modelValue);
    } else {
      $modelSelect.parent().parent().hide();
    }
  });

  window.do_main_work = do_main_work;
}

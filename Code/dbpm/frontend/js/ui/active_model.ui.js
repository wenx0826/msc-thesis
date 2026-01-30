let $modelActionBar;
let $cancelButton;
let $regeneratedModelActionBar;
let $deleteModelButton;
let $datDetails;
let $applyPromptButton;
let $promptInput;
let $clearPromptButton;
let $promptContainer;
let $promptActionBar;
let $replaceButton;
let $backButton;
let $sendPromptButton;
let $viewModelDataLink;
let $exportTestsetButton;

$(document).ready(function () {
  $modelActionBar = $("#modelActionBar");
  $exportTestsetButton = $("#exportTestsetButton");
  $regeneratedModelActionBar = $("#regeneratedModelActionBar");
  $deleteModelButton = $("#deleteModelButton");
  $datDetails = $("#dat_details");
  $promptInput = $("#promptInput");
  $promptContainer = $("#promptContainer");
  $promptActionBar = $("#promptActionBar");
  $sendPromptButton = $("#sendPromptButton");
  $clearPromptButton = $("#clearPromptButton");
  $replaceButton = $("#replaceButton");
  $backButton = $("#backButton");
  $cancelButton = $("#cancelButton");
  $viewModelDataLink = $("#viewModelDataLink");

  $viewModelDataLink.on("click", (e) => {
    e.preventDefault();
    window.open(
      "/data/models/" + Store.workspace.getActiveModelId() + ".xml",
      "_blank",
    );
  });
  $exportTestsetButton.on("click", (e) => {
    e.preventDefault();
    console.log("Exporting testset by active model");
    const filename = "testset_" + Store.workspace.getActiveModelId() + ".xml";
    // const text =
    //   '<?xml version="1.0"?>\n<testset xmlns="http://cpee.org/ns/properties/2.0">\n<executionhandler>ruby</executionhandler>\n<dataelements/>\n<endpoints/>\n<attributes>\n<guarded>none</guarded>\n<modeltype>CPEE</modeltype>\n<theme>preset</theme>\n<guarded_id/>\n<info>Subprocess</info>\n<creator>Christine Ashcreek</creator>\n<author>Christine Ashcreek</author>\n<model_uuid>1fc43528-3e4a-40ee-8503-c0ed7e5d883c</model_uuid>\n<model_version/>\n<design_stage>development</design_stage>\n<design_dir>Templates.dir</design_dir>\n</attributes>' +
    //   Store.activeModel.getSerializedData() +
    //   "\n</testset>";

    const text =
      '<?xml version="1.0"?>\n<testset xmlns="http://cpee.org/ns/properties/2.0">\n<executionhandler>ruby</executionhandler>\n<dataelements/>\n<endpoints/>\n<attributes>\n<guarded>none</guarded>\n<modeltype>CPEE</modeltype>\n<theme>preset</theme>\n<guarded_id/>\n<info>Subprocess</info>\n<creator>Christine Ashcreek</creator>\n<author>Christine Ashcreek</author>\n<model_uuid>1fc43528-3e4a-40ee-8503-c0ed7e5d883c</model_uuid>\n<model_version/>\n<design_stage>development</design_stage>\n<design_dir>Templates.dir</design_dir>\n</attributes>\n<description>' +
      Store.activeModel.getSerializedData() +
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

    // workspaceService.exportTestsetByActiveModel();
  });
  $deleteModelButton.on("click", deleteActiveModel);
  $replaceButton.on("click", async () => {
    $regeneratedModelActionBar.hide();
    modelService.updateActiveModel();
    syncActiveModelGraphInList();
  });
  $cancelButton.on("click", () => {
    activeModel = null;
    $("#activeModelName").text("");
    $("#graphcanvas").empty();
    $("#generatedModelActionBar").css("visibility", "hidden");
  });
  $("#activeModelContainer").click(function (e) {
    $("#graphgrid .selected").removeClass("selected");
    // save["graph_adaptor"].illustrator.get_elements().removeClass("marked");
    localStorage.removeItem("marked");
    localStorage.removeItem("marked_from");
    $("#dat_details").empty();
    // question:
    // e.stopImmediatePropagation();
  });
  $promptInput.on("input", () => {
    const promptText = $promptInput.text();
    // console.log("Prompt input changed:", promptText);
    if (promptText && promptText.trim() !== "") {
      $promptActionBar.removeAttr("disabled");
    } else {
      $promptActionBar.attr("disabled", "disabled");
    }
    // You can add additional logic here if needed
  });
  $clearPromptButton.on("mousedown", (e) => {
    e.preventDefault(); // Prevent losing focus on the input
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

    // console.log("Applying prompt from button:", promptText);
    modelService.generateModelByPrompt(promptText);
  });
});

activeModelStore.subscribe((state, { key, oldValue, newValue }) => {
  switch (key) {
    case "model":
      const newModelId = newValue ? newValue.id : null;
      const modelUpdateType = newValue ? newValue.updateType : null;
      if (newValue) {
        $("#activeModelName").text(newValue.name ? newValue.name : "");
        $modelActionBar.prop("disabled", false);
        $datDetails.empty();
        showActiveModel(newValue);
        if (newModelId) {
          $promptContainer.show();
        }
        if (
          [
            MODEL_UPDATE_TYPE.REGENERATION_BY_PROMPT,
            MODEL_UPDATE_TYPE.REGENERATION_BY_SELECTIONS,
          ].includes(modelUpdateType)
        ) {
          $regeneratedModelActionBar.show();
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
  console.log("???Workspace store changed:", key, oldValue, newValue);
  switch (key) {
    case "activeModelId":
      break;
    default:
      break;
  }
});

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
  // console.log("Saving active model with SVG:", gc[0]);

  modelsStore.updateModelById(workspaceStore.getActiveModelId(), {
    svg: gc[0].outerHTML,
  });
}

function saveActiveModel(type) {
  modelService.updateActiveModel(type);
  syncActiveModelGraphInList();
}

function deleteActiveModel(e) {
  const activeModelId = activeModelStore.getModelId();
  // activeModelStore.deleteModel();
  modelsStore.deleteModelById(activeModelId);
  removeSelectionsByModelId(activeModelId);
}

function clearModelViewer() {
  // console.log('Clearing active model canvas');
  $("#activeModelName").text("");
  $modelActionBar.prop("disabled", true);
  $("#graphcanvas").empty();
  $datDetails.empty();
  $promptContainer.hide();
}

const showActiveModel = (model) => {
  // save["state"] = model.id ? "ready" : undefined;
  save["state"] = "ready";
  save["graph_theme"] = "preset_copy";
  save["graph_adaptor"] = new WfAdaptor(
    "themes/preset_copy/theme.js",
    function (graphrealization) {
      // graphrealization.draw_labels = (max, labels, dimensions, striped) => {
      //   draw_extended_columns(graphrealization, max, labels, dimensions, striped)
      // };
      graphrealization.set_svg_container($("#graphcanvas"));
      graphrealization.set_label_container($("#graphgrid"));
      graphrealization.set_description($(model.data), true);
      graphrealization.notify = function (svgid) {
        // console.log("!!!!!!Graph realization notify for svgid:", svgid);
        var g = graphrealization.get_description();
        console.log("Bug! Cannot get description g=", g);
        /*save["graph"] = $X(g);
        save["graph"].removeAttr("svg-id");
        save["graph"].removeAttr("svg-type");
        save["graph"].removeAttr("svg-subtype");
        save["graph"].removeAttr("svg-label");
        document.dispatchEvent(graph_changed);
        */
        manifestation.events.click(svgid);
        format_instance_pos();
        if (manifestation.selected() == "unknown") {
          // nothing selected
          $("#dat_details").empty();
        }
        saveActiveModel(MODEL_UPDATE_TYPE.MANUAL_UPDATE_GRAPH_CHANGED);
      };
    },
  );
};

const regenerateModel = async () => {
  const selectedText = Store.getTemporarySelections()
    .map((range) => range.toString())
    .join(" ");
  const generatedModel = await createSampleModel();
  const activeModel = Store.getActiveModel();

  const model = {
    ...activeModel,
    data: generatedModel,
  };
  //   setActiveModel(activeModel.id);
  Store.setActiveModel(model);
  showActiveModel(model);
  $generateButton.prop("disabled", false);
  $regenerateButton.prop("disabled", false);
  $("#generatedModelActionBar").css("visibility", "visible");
};

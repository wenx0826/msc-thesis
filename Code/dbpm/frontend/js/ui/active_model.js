let $modelActionBar;
let $keepButton;
let $cancelButton;
let $generatedModelActionBar;
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

$(document).ready(function () {
  $modelActionBar = $("#modelActionBar");
  $keepButton = $("#keepButton");
  $cancelButton = $("#cancelButton");
  $generatedModelActionBar = $("#generatedModelActionBar");
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
  $keepButton.on("click", async () => {
    let modelId = activeModelStore.getModelId();
    const activeModel = activeModelStore.getModel();
    if (!modelId) {
      modelService.keepActiveModel(temporarySelections);
    }
    $("#generatedModelActionBar").hide();
  });
  $replaceButton.on("click", async () => {
    saveActiveModel();
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
    // e.stopImmediatePropagation();
  });
  $promptInput.on("input", () => {
    const promptText = $promptInput.text();
    console.log("Prompt input changed:", promptText);
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
    activeModelStore.generateModelByPrompt(promptText);
  });
});

activeModelStore.subscribe((state, { key, oldValue, newValue }) => {
  switch (key) {
    case "model":
      const newModelId = newValue ? newValue.id : null;
      const oldModelId = oldValue ? oldValue.id : null;
      if (newValue) {
        showActiveModel(newValue);
        if (!newModelId) {
          $generatedModelActionBar.show();
        } else {
          $modelActionBar.css("visibility", "visible");
          if (newModelId == oldModelId) {
            $regeneratedModelActionBar.show();
          } else if (newModelId != oldModelId) {
            // $promptContainer.removeClass("disabled");
            const modelDocumentId = activeModelStore.getDocumentId();
            if (modelDocumentId)
              //mini bug here has to use this if otherwise new trace cannot be created yet for new model
              activeDocumentStore.setDocumentById(modelDocumentId);
          }
        }
      } else {
        clearModelViewer();
      }
      // case "name":
      //   $("#activeModelName").text(newValue ? newValue : "");
      //   break;
      // case "data":
      //   if (!newValue) {
      //     clearModelViewer();
      //     return;
      //   }
      //   showActiveModel(state.data);
      //   // console.log("Active model data updated:", newValue);
      //   const modelId = workspaceStore.getActiveModelId();
      //   if (!modelId) {
      //     $generatedModelActionBar.show();
      //   } else {
      //     $modelActionBar.css("visibility", "visible");
      //     if (oldValue) {
      //       $regeneratedModelActionBar.show();
      //     }
      //   }

      break;
    default:
      break;
  }
});

workspaceStore.subscribe(async (state, { key, oldValue, newValue }) => {
  switch (key) {
    case "activeModelId":
      // if (newValue == oldValue) {

      // }
      break;
    default:
      break;
  }
});

function saveActiveModel() {
  modelService.updateActiveModelData();
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

function deleteActiveModel(e) {
  const activeModelId = activeModelStore.getModelId();
  // activeModelStore.deleteModel();
  modelsStore.deleteModelById(activeModelId);
  removeSelectionsByModelId(activeModelId);
}

const clearModelViewer = () => {
  // $("#activeModelName").text("");
  // console.log('Clearing active model canvas');
  $("#graphcanvas").empty();
  $modelActionBar.css("visibility", "hidden");
  $datDetails.empty();
};

const showActiveModel = (model) => {
  console.log("Showing active model:", model);
  $("#activeModelName").text(model.name ? model.name : "");
  $datDetails.empty();

  save["state"] = model.id ? "ready" : undefined;
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
        saveActiveModel();
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

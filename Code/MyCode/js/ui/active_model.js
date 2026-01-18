let $keepButton;
let $cancelButton;

$(document).ready(function () {
  $keepButton = $("#keepButton");
  $cancelButton = $("#cancelButton");
  $keepButton.on("click", async () => {
    let modelId = activeModelStore.getModelId();
    const activeModel = activeModelStore.getModel();

    if (!modelId) {
      const svgContent = $("#activeModelCanvas");
      const $svgCopy = svgContent.clone(false);
      $svgCopy.removeAttr("id");
      const svg = $svgCopy.prop("outerHTML");
      activeModel.svg = svg;
      activeModel.data = new XMLSerializer().serializeToString(
        activeModel.data,
      );
      modelsStore.createModel(activeModel).then((model) => {
        renderModelInList(model);
        console.log("Created model with ID:", model);
        activeModelStore.setModel(model);

        const sections = temporarySelections.map((range) =>
          serializeRange(range),
        );
        tracesStore.createTrace(sections).then((trace) => {
          clearTemporarySelections(); //to improve
          renderTrace(trace);
        });
      });
      //
      // const model = await modelsStore.createModel(activeModel);
      // // modelsStore.addModel(model);
      // activeModelStore.setModel(model);
      // modelId = model.id;
    } else {
      // model = await updateModel(db, modelId, activeModel);
      await saveModel();
    }

    // Store.addModel(model);
    // var trace = {
    //   document_id: activeDocumentStore.getActiveDocumentId(),
    //   model_id: modelId,
    //   selections: temporarySelections().map((range) => serializeRange(range)),
    // };

    // await API.Trace.createTrace(trace);

    // Store.addTrace(trace);

    $generateButton.prop("disabled", true);
    $("#generatedModelActionBar").css("visibility", "hidden");
  });

  $cancelButton.on("click", () => {
    activeModel = null;
    $("#activeModelName").text("");
    $("#activeModelCanvas").empty();
    $("#generatedModelActionBar").css("visibility", "hidden");
  });
});

activeModelStore.subscribe((state, { key, oldValue, newValue }) => {
  switch (key) {
    case "id":
      // if (newValue) {
      //   const model = Store.getModelById(newValue);
      //   if (model) {
      //     showActiveModel(model);
      //   }
      // } else {
      //   clearModelViewer();
      // }
      break;
    case "model":
      if (newValue) {
        showActiveModel(newValue);
      } else {
        clearModelViewer();
      }
      break;
  }
});

const saveModel = async (e) => {
  const svgContent = $("#activeModelCanvas");
  const $svgCopy = svgContent.clone(false);
  $svgCopy.removeAttr("id");
  const svg = $svgCopy.prop("outerHTML");
  const activeModel = Store.getActiveModel();
  activeModel.svg = svg;
  // activeModel.data = new XMLSerializer().serializeToString(activeModel.data);
  // const updatedModel = { ...activeModel, data: new XMLSerializer().serializeToString(activeModel.data) };
  // updateModel(db, activeModel.id, );
  const updatedModel = await updateModel(db, activeModel.id, {
    svg: svg,
    data: new XMLSerializer().serializeToString(activeModel.data),
  });
  const models = Store.getModels();
  const idx = models.findIndex((m) => m.id === updatedModel.id);
  if (idx !== -1) {
    models[idx] = updatedModel;

    const $container = $(`.model-container[data-modelid="${updatedModel.id}"]`);
    if ($container.length) {
      // Rebuild container contents
      $container.empty().text(updatedModel.name);

      const $gridDiv = $("<div>").attr("id", `modelGrid_${updatedModel.id}`);
      try {
        const svgDoc = new DOMParser().parseFromString(
          updatedModel.svg || "",
          "image/svg+xml",
        ).documentElement;
        if (svgDoc) $gridDiv.append(svgDoc);
      } catch (err) {
        console.warn("Failed to parse updated model SVG:", err);
      }
      $container.append($gridDiv);

      // Reattach click handler
      $container.off("click").on("click", (e) => {
        e.stopPropagation();
        Store.setActiveModel(updatedModel.id);
      });
    }
  } else {
    models.push(updatedModel);
    renderModelInList(updatedModel);
  }
};

function deleteActiveModel(e) {
  const activeModelId = activeModelStore.getModelId();
  // activeModelStore.deleteModel();
  modelsStore.deleteModelById(activeModelId);
  removeSelectionsByModelId(activeModelId);
}

const clearModelViewer = () => {
  $("#activeModelName").text("");
  // console.log('Clearing active model canvas');
  $("#activeModelCanvas").empty();
};
const showActiveModel = (model) => {
  // const { name: modelName, data: modelData } = model;
  $("#activeModelName").text(model.name);
  // console.log('Showing model:', model);
  var parser = new DOMParser();
  let data = parser.parseFromString(model.data, "application/xml");
  console.log("Parsed model data:", data.documentElement.nodeName);
  if (data.documentElement.nodeName != "description") {
    data = $("description", data)[0];
  } else {
    data = data.documentElement;
  }
  model.data = data;
  console.log("Parsed model data for visualization:", data);
  save["graph_theme"] = "preset_copy";
  save["graph_adaptor"] = new WfAdaptor(
    "themes/preset_copy/theme.js",
    function (graphrealization) {
      // graphrealization.draw_labels = (max, labels, dimensions, striped) => {
      //   draw_extended_columns(graphrealization, max, labels, dimensions, striped)
      // };
      graphrealization.set_svg_container($("#activeModelCanvas"));
      graphrealization.set_label_container($("#activeModelGrid"));
      graphrealization.set_description($(data), true);
      graphrealization.notify = function (svgid) {
        // console.log("!!!!!!Graph realization notify for svgid:", svgid);
        var g = graphrealization.get_description();
        // console.log("!!!!!!Graph realization notify for g???:", g);

        /*save["graph"] = $X(g);
        save["graph"].removeAttr("svg-id");
        save["graph"].removeAttr("svg-type");
        save["graph"].removeAttr("svg-subtype");
        save["graph"].removeAttr("svg-label");
        document.dispatchEvent(graph_changed);*/
        if (save["modeltype"] != "CPEE") {
          /*
          $.ajax({
            type: "PUT",
            url: url + "/properties/attributes/modeltype/",
            data: { value: "CPEE" },
            error: report_failure,
          });
          $.ajax({
            type: "PUT",
            url: url + "/properties/transformation/",
            contentType: "text/xml",
            headers: {
              "Content-ID": "transformation",
              "CPEE-Event-Source": myid,
            },
            data: '<transformation xmlns="http://cpee.org/ns/properties/2.0"><description type="copy"/><dataelements type="none"/><endpoints type="none"/></transformation>',
            success: function () {
              $.ajax({
                type: "PUT",
                url: url + "/properties/description/",
                contentType: "text/xml",
                headers: {
                  "Content-ID": "description",
                  "CPEE-Event-Source": myid,
                },
                data: g,
                error: report_failure,
              });
            },
            error: report_failure,
          });
          */
        } else {
          /*
          $.ajax({
            type: "PUT",
            url: url + "/properties/description/",
            contentType: "text/xml",
            headers: {
              "Content-ID": "description",
              "CPEE-Event-Source": myid,
            },
            data: g,
            error: report_failure,
          });
          */
        }
        manifestation.events.click(svgid);
        format_instance_pos();
        if (manifestation.selected() == "unknown") {
          // nothing selected
          $("#dat_details").empty();
        }
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

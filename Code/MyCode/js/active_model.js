let $keepButton;
let $cancelButton;

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
          "image/svg+xml"
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
const deleteActiveModel = async (e) => {
  const activeModelId = Store.getActiveModelId();
  Store.deleteModel(activeModelId);
  // const activeModel = Store.getActiveModel();
  // if (!activeModel || !activeModel.id) return;

  // await deleteModelById(db, activeModel.id);
  // Store.removeModelById(activeModel.id);
  // clearModelViewer();
  // Store.setActiveModel(null);
};
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
    }
  );
};

const createSampleModel = async () => {
  // choose a random XML from the "templates" folder and return its text

  const templatesFolder = "templates/";

  async function fetchTemplatesList() {
    try {
      const r = await fetch(`${templatesFolder}templates.json`);
      if (r.ok) {
        const arr = await r.json();
        return arr.map((f) => `${f.name}.xml`);
      }
    } catch (e) {
      console.error("Error fetching .templates.json:", e);
    }
  }

  try {
    const list = await fetchTemplatesList();
    // const list = [];
    if (!list || !list.length) {
      throw new Error("No templates found in templates.json");
    }
    const chosen = list[Math.floor(Math.random() * list.length)];
    const resp = await fetch(`${templatesFolder}${chosen}`);
    console.log("Fetched template:", chosen);
    if (!resp.ok) {
      throw new Error(
        `Failed to fetch template ${chosen}, status ${resp.status}`
      );
    }
    return await resp.text();
  } catch (err) {
    console.error("createSampleModel error:", err);
    // final fallback
    const resp = await fetch("sample_model_with_subprocess.xml");
    // const resp = await fetch('sample_model.xml');
    if (!resp.ok) throw err;
    return await resp.text();
  }
};

const generateModelLLM = async (inputText) => {
  // Placeholder for LLM integration
  // In a real implementation, this would call an API to generate a model based on inputText
  console.log("Generating model using LLM for input text:", inputText);
  // For now, just return a sample model

  const xml = '<description xmlns="http://cpee.org/ns/description/1.0"/>';

  const fd = new FormData();
  fd.append("rpst_xml", new Blob([xml], { type: "text/xml" }));
  fd.append("user_input", new Blob([inputText], { type: "text/plain" }));
  fd.append("llm", new Blob(["gemini-2.0-flash"], { type: "text/plain" }));

  const llmResponse = $.ajax({
    url: "https://autobpmn.ai/llm/",
    method: "POST",
    data: fd,
    contentType: false,
    processData: false,
    xhrFields: { withCredentials: true },
    crossDomain: true,
    success: (data) => {
      console.log("LLM generation request sent successfully", data);
      return data;
    },
    error: (xhr) => {
      console.log(
        "LLM generation request failed",
        xhr.status,
        xhr.responseText
      );
      throw new Error(`LLM request failed: ${xhr.status}`);
    },
  });

  return llmResponse;

  // return new Promise((resolve, reject) => {
  //   $.ajax({
  //     url: "https://autobpmn.ai/llm/",
  //     method: "POST",
  //     data: fd,
  //     contentType: false,
  //     processData: false,
  //     xhrFields: { withCredentials: true },
  //     crossDomain: true,
  //     success: (data) => {
  //       console.log('LLM generation request sent successfully', data);
  //       resolve(data);
  //     },
  //     error: (xhr) => {
  //       console.log("LLM generation request failed", xhr.status, xhr.responseText);
  //       reject(new Error(`LLM request failed: ${xhr.status}`));
  //     }
  //   });
  // });

  // return await createSampleModel();
};

const generateModel = async () => {
  const selectedText = Store.getTemporarySelections()
    .map((range) => range.toString())
    .join(" ");

  let generatedModel;
  try {
    const res = await generateModelLLM(selectedText);
    if (typeof res === "string") {
      generatedModel = res;
    } else if (res && res.rpst_xml) {
      generatedModel =
        typeof res.rpst_xml === "string"
          ? res.rpst_xml
          : new XMLSerializer().serializeToString(res.rpst_xml);
    } else if (res && res.xml) {
      generatedModel =
        typeof res.xml === "string"
          ? res.xml
          : new XMLSerializer().serializeToString(res.xml);
    } else if (res && res.description) {
      generatedModel =
        typeof res.description === "string"
          ? res.description
          : new XMLSerializer().serializeToString(res.description);
    } else {
      generatedModel =
        '<description xmlns="http://cpee.org/ns/description/1.0"/>';
    }
  } catch (err) {
    console.log("001 Error generating model:", err);
    const rejectMessage =
      err?.message ??
      err?.responseText ??
      (typeof err === "string" ? err : JSON.stringify(err));
    console.log("002 Reject message:", rejectMessage);

    // $generateButton.prop('disabled', false);
    generatedModel = await createSampleModel();

    // return;
  }
  console.log("003 Next step -  Generated Model :", generatedModel);
  activeModel = {
    data: generatedModel,
  };
  showActiveModel(activeModel);
  $generateButton.prop("disabled", false);
  $("#generatedModelActionBar").css("visibility", "visible");
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

$(document).ready(function () {
  $keepButton = $("#keepButton");
  $cancelButton = $("#cancelButton");

  $keepButton.on("click", async () => {
    let modelId = Store.getActiveModelId();
    let model;

    if (!modelId) {
      const svgContent = $("#activeModelCanvas");
      const $svgCopy = svgContent.clone(false);
      $svgCopy.removeAttr("id");
      const svg = $svgCopy.prop("outerHTML");
      activeModel.svg = svg;
      activeModel.data = new XMLSerializer().serializeToString(
        activeModel.data
      );
      modelId = await createModel(db, activeModel);
      model = await updateModel(db, modelId, { name: `Model_${modelId}` });
      renderModelInList(model);
    } else {
      // model = await updateModel(db, modelId, activeModel);
      await saveModel();
    }

    Store.addModel(model);
    Store.setActiveModel(null);
    var trace = {
      document_id: Store.getActiveDocumentId(),
      model_id: modelId,
      selections: Store.getTemporarySelections().map((range) =>
        serializeRange(range)
      ),
    };

    await createTrace(db, trace);

    Store.addTrace(trace);
    renderTrace(trace);
    clearTemporarySelections();
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

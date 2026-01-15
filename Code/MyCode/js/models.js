const loadModels = async () => {
  const traces = Store.getTraces();
  for (const trace of traces) {
    const model = await getModelById(db, trace.model_id);
    Store.addModel(model);
    await renderModelInList(model);
  }
};

const showModel = (model) => {
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
    }
  );
};

const setActiveModel = async (modelId) => {
  const activeModel = Store.getActiveModel;
  // const activeModel = Store.state.activeModel;
  console.log("001-Setting active model to ID:", modelId);
  if (modelId && modelId != (activeModel && activeModel.id)) {
    console.log("001-Setting active model to ID:", modelId);
    const model = await getModelById(db, modelId);
    Store.setActiveModel(model);
    showModel(model);
    $(".model-container").removeClass("active");
    $(`.model-container[data-modelid="${modelId}"]`).addClass("active");

    const documentId = Store.getActiveModelDocumentId();
    await setActiveDocument(documentId);

    $(".selection-wrapper").removeClass("active");
    $(`.selection-wrapper[data-modelid="${modelId}"]`).addClass("active");
  } else if (!modelId) {
    Store.setActiveModel(null);
    $(".model-container").removeClass("active");
    $(".selection-wrapper").removeClass("active");

    $("#activeModelName").text("");
    // console.log('Clearing active model canvas');
    $("#activeModelCanvas").empty();
  }
};
const renderModelInList = async ({
  id: modelId,
  name: modelName,
  content: modelContent,
  svg: svgContent,
}) => {
  var gridId = `modelGrid_${modelId}`;
  var canvasId = `modelCanvas_${modelId}`;
  const $modelsArea = $("#models");
  const $modelContainer = $("<div>")
    .addClass("model-container")
    .attr("data-modelid", modelId);
  $modelContainer.text(`${modelName}`);

  $modelsArea.append($modelContainer);
  const $gridDiv = $("<div>").attr("id", gridId);

  const svgData = new DOMParser().parseFromString(
    svgContent,
    "image/svg+xml"
  ).documentElement;
  $gridDiv.append(svgData);
  $gridDiv.append(svgData);
  $modelContainer.append($gridDiv);
  $modelContainer.on("click", (event) => {
    event.stopPropagation();
    setActiveModel(modelId);
  });
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
  const selectedText = temporarySelections
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
  showModel(activeModel);
  $generateButton.prop("disabled", false);
  $("#generatedModelActionBar").css("visibility", "visible");
};

const regenerateModel = async () => {
  const selectedText = temporarySelections
    .map((range) => range.toString())
    .join(" ");
  generatedModel = await createSampleModel();
  activeModel = {
    ...activeModel,
    data: generatedModel,
  };
  showModel(activeModel);
  $generateButton.prop("disabled", false);
  $regenerateButton.prop("disabled", false);
  $("#generatedModelActionBar").css("visibility", "visible");
};

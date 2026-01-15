const loadModels = async () => {
  const traces = Store.getTraces();
  for (const trace of traces) {
    const model = await getModelById(db, trace.model_id);
    Store.addModel(model);
    await renderModelInList(model);
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
    Store.setActiveModelById(modelId);
  });
};

const highlightActiveModelInList = (modelId) => {
  $(".model-container").removeClass("active");
  $(`.model-container[data-modelid="${modelId}"]`).addClass("active");
};

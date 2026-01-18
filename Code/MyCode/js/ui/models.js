const $modelsArea = $("#models");

activeModelStore.subscribe((state, { key, oldValue, newValue }) => {
  if (key === "model") {
    if (newValue && newValue.id) {
      highlightActiveModelInList(newValue.id);
    }
    if (oldValue && oldValue.id) {
      unhighlightActiveModelInList(oldValue.id);
    }
  }
});
modelsStore.subscribe((state, { key, operation, id }) => {
  switch (operation) {
    // case "add":
    //   renderModelInList(state.models.find((model) => model.id === id));
    //   break;
    case "update":
      rerenderModelInList(id);
      break;
    case "delete":
      console.log("Model deleted with ID:", id);
      removeModelFromList(id);
      break;
  }
});
// function renderModelInContainer({ name, svg: svgContent }, $container) {
//   $container.empty();
//   const svgData = new DOMParser().parseFromString(
//     svgContent,
//     "image/svg+xml",
//   ).documentElement;
//   $container.append(svgData);
// }
const renderModelInList = ({
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
    "image/svg+xml",
  ).documentElement;
  $gridDiv.append(svgData);
  $gridDiv.append(svgData);
  $modelContainer.append($gridDiv);
  $modelContainer.on("click", (event) => {
    event.stopPropagation();
    activeModelStore.setModelById(modelId);
  });
};

const rerenderModelInList = (modelId) => {
  const model = modelsStore.getModelById(modelId);
  if (!model) {
    console.warn(`Model with ID ${modelId} not found for rerendering.`);
    return;
  }
  const $modelContainer = $(`.model-container[data-modelid="${modelId}"]`);
  $modelContainer.empty();
  $modelContainer.text(`${model.name}`);

  const gridId = `modelGrid_${model.id}`;
  const $gridDiv = $("<div>").attr("id", gridId);

  const svgData = new DOMParser().parseFromString(
    model.svg,
    "image/svg+xml",
  ).documentElement;
  $gridDiv.append(svgData);
  $modelContainer.append($gridDiv);
};

const highlightActiveModelInList = (modelId) => {
  // $(".model-container").removeClass("active");
  $(`.model-container[data-modelid="${modelId}"]`).addClass("active");
};
const unhighlightActiveModelInList = (modelId) => {
  $(`.model-container[data-modelid="${modelId}"]`).removeClass("active");
};
const removeModelFromList = (modelId) => {
  $(`.model-container[data-modelid="${modelId}"]`).remove();
};

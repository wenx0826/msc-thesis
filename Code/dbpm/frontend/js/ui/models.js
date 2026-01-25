const $modelsArea = $("#models");

workspaceStore.subscribe(async (state, { key, oldValue, newValue }) => {
  switch (key) {
    case "activeModelId":
      if (newValue) {
        highlightActiveModelContainer(newValue);
      }
      if (oldValue) {
        unhighlightActiveModelContainer(oldValue);
      }
      break;
    default:
      break;
  }
});

modelsStore.subscribe(async (state, { key, operation, value }) => {
  switch (operation) {
    case "init":
      const models = modelsStore.getModels();
      for (const model of models) {
        await renderModelInList(model);
      }
      break;
    case "add":
      await renderModelInList(value);
      break;
    case "update":
      updateModelInList(value);
      break;
    case "delete":
      console.log("Model deleted with ID:", value.id);
      removeModelFromList(value.id);
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

let seq = 0;
const pending = new Map();

function getModelSvg(input) {
  console.log("getModelSvg called from:", new Error().stack);
  //TODO: how to deal pending???
  return new Promise(async (resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    $("#converter-frame")[0].contentWindow.postMessage(
      { id, input, source: "getModelSvg" },
      window.origin,
    );
  });
}
async function renderModelInList(model) {
  const modelId = model?.meta?.id;
  var gridId = `modelGrid_${modelId}`;
  const $modelsArea = $("#models");
  const $modelContainer = $("<div>")
    .addClass("model-container")
    .attr("data-modelid", modelId)
    .attr("data-documentid", model.documentId);
  if (modelId == workspaceStore.getActiveModelId()) {
    $modelContainer.addClass("active");
  }
  $modelContainer.text(`${model.meta.name}`);
  $modelsArea.append($modelContainer);
  const $gridDiv = $("<div>").attr("id", gridId);
  $modelContainer.on("click", (event) => {
    event.stopPropagation();
    modelService.toggleModelSelection(modelId);
    // activeModelStore.setModel(activeModeId == modelId ? null : model);
  });
  // console.log("Model rendered in list:", model);
  $modelContainer.append($gridDiv);

  const outputFrame = await getModelSvg({ id: modelId });
  // console.log("Converted SVG content from model data:", outputFrame);
  model.svg = new DOMParser().parseFromString(
    outputFrame,
    "image/svg+xml",
  ).documentElement;

  $gridDiv.append(model.svg);
}

function updateModelInList(model) {
  const modelId = model?.meta?.id;
  var gridId = `modelGrid_${modelId}`;
  const $gridDiv = $(`#${gridId}`);
  $gridDiv.empty();
  $gridDiv.append(model.svg);
}
const highlightActiveModelContainer = (modelId) => {
  // $(".model-container").removeClass("active");
  $(`.model-container[data-modelid="${modelId}"]`).addClass("active");
};
const unhighlightActiveModelContainer = (modelId) => {
  $(`.model-container[data-modelid="${modelId}"]`).removeClass("active");
};
const removeModelFromList = (modelId) => {
  $(`.model-container[data-modelid="${modelId}"]`).remove();
};

window.addEventListener("message", (e) => {
  const { id, ok, result, error } = e.data || {};
  if (!pending.has(id)) return;

  const { resolve, reject } = pending.get(id);
  pending.delete(id);

  ok ? resolve(result) : reject(new Error(error));
});

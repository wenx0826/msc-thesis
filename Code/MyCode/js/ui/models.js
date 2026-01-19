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
      // rerenderModelInList(id);
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

let seq = 0;
const pending = new Map();

function convertDataToSVG(input) {
  console.log("convertDataToSVG called from:", new Error().stack);
  //TODO: how to deal pending???
  return new Promise(async (resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    $("#converter-frame")[0].contentWindow.postMessage(
      { id, input, source: "convertDataToSVG" },
      window.origin,
    );
  });
}
async function renderModelInList(model) {
  console.log("Calling convertDataToSVG to render model in list:", model.id);
  const outputFrame = await convertDataToSVG(model);
  // console.log("Converted SVG content from model data:", outputFrame);

  const svgData = new DOMParser().parseFromString(
    outputFrame,
    "image/svg+xml",
  ).documentElement;

  var gridId = `modelGrid_${model.id}`;
  const $modelsArea = $("#models");
  const $modelContainer = $("<div>")
    .addClass("model-container")
    .attr("data-modelid", model.id);
  $modelContainer.text(`${model.name}`);
  $modelsArea.append($modelContainer);
  const $gridDiv = $("<div>").attr("id", gridId);
  $gridDiv.append(svgData);
  $modelContainer.append($gridDiv);
  $modelContainer.on("click", (event) => {
    event.stopPropagation();
    activeModelStore.setModelById(model.id);
  });
  console.log("Model rendered in list:", model);
}

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

window.addEventListener("message", (e) => {
  const { id, ok, result, error } = e.data || {};
  if (!pending.has(id)) return;

  const { resolve, reject } = pending.get(id);
  pending.delete(id);

  ok ? resolve(result) : reject(new Error(error));
});

document.addEventListener("store:active-document-id-changed", async () => {
  console.log("EVENT LISTENER: store:active-document-id-changed");

  clearTemporarySelections();
  const activeDocumentId = Store.getActiveDocumentId();
  const activeModelDocumentId = Store.getActiveModelDocumentId();
  if (activeDocumentId) {
    await loadDocument(activeDocumentId);
    rerenderTracesLayer();
    //   selectActiveDocumentSelections();
    highlightActiveDocumentItem(activeDocumentId);
    rerenderOverlayLayers();
  }
  if (activeModelDocumentId != activeDocumentId) {
    Store.setActiveModel(null);
  }
});

const setActiveModel = async (modelId) => {
  const activeModel = Store.getActiveModel();
  // const activeModel = Store.state.activeModel;
  if (modelId && modelId != (activeModel && activeModel.id)) {
    const model = await getModelById(db, modelId);
    Store.setActiveModel(model);
    showActiveModel(model);
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

document.addEventListener("store:active-model-changed", () => {
  console.log("EVENT LISTENER: store:active-model-changed");
  const activeModel = Store.getActiveModel();
  const activeModelId = Store.getActiveModelId();

  if (!activeModel) {
    clearModelViewer();
  } else {
    showActiveModel(activeModel);
    if (activeModelId) {
      highlightActiveModelInList(activeModelId);
      const activeModelDocumentId = Store.getActiveModelDocumentId();
      const activeDocumentId = Store.getActiveDocumentId();
      if (activeModelDocumentId != activeDocumentId)
        Store.setActiveDocumentId(activeModelDocumentId);
    }
  }
});

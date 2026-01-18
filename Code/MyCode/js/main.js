// const deleteDocument = async (docId) => {};

const loadData = async () => {
  const documentList = await API.Document.getDocumentList();
  Store.documents.setDocumentList(documentList);
  documentList.forEach((doc) => {
    renderDocumentItem(doc);
  });
  console.log("Loaded documents:", documentList);
  for (const { id: docId } of documentList) {
    const newTraces = await API.Trace.getTracesByDocumentId(docId);
    console.log("Loaded traces for document", docId, newTraces);
    Store.traces.addTraces(newTraces);
    for (const { model_id: modelId } of newTraces) {
      API.Model.getModelById(modelId).then((model) => {
        Store.models.addModel(model);
        renderModelInList(model);
      });
    }
  }
  if (documentList.length) {
    Store.activeDocument.setActiveDocumentId(
      documentList[documentList.length - 1]?.id,
    );
  }
};

$(document).ready(async () => {
  await API.init();
  await loadData();
  console.log("Initialization complete.", Store.state);
  $("#columnResizehandle1").on("dragcolumnmove", rerenderOverlayLayers);
  // generateModel();
  // var timer;
  // $(document).on('input', '#dat_details input, #dat_details textarea, #dat_details [contenteditable]', function (e) {
  //   console.log('!!!Input detected, scheduling auto-save...');
  //   clearTimeout(timer);
  //   timer = setTimeout(do_main_save, 5000);
  // });
  // // only for contenteditable divs
  // $(document).on('keypress', '#dat_details div[contenteditable]', function (e) {
  //   if (e.keyCode == 13) {
  //     document.execCommand('insertLineBreak')
  //     e.preventDefault()
  //   }
  // });
  // $(document).on('relaxngui_remove', '#dat_details', function (e) {
  //   clearTimeout(timer);
  //   do_main_save();
  // });
  // $(document).on('relaxngui_move', '#dat_details', function (e) {
  //   clearTimeout(timer);
  //   do_main_save();
  // });
  // $(document).on('relaxngui_change', '#dat_details', function (e) {
  //   clearTimeout(timer);
  //   do_main_save();
  // });
});

document.addEventListener("store:document-deleted", async (e) => {
  console.log("EVENT LISTENER: store:document-deleted");
  const documentId = e.detail.documentId;
  await deleteDocumentCascadeById(db, documentId);
  removeDocumentItem(documentId);
  // const docTraces = getDocumentTraces(docId);
  // docTraces.forEach((trace) => {
  //   const modelIndex = models.findIndex((m) => m.id == trace.model_id);
  //   if (modelIndex !== -1) {
  //     models.splice(modelIndex, 1);
  //   }
  //   const $modelDiv = $modelsArea.find(`div[data-modelid='${trace.model_id}']`);
  //   $modelDiv.remove();
  // });

  // if (activeDocId == docId) {
  //   clearOverlayLayers();
  //   $documentContent.empty();
  //   activeDocId = null;
  //   $generateButton.prop("disabled", true);
  // }
  // if (getActiveModelDocumentId() == docId) {
  //   setActiveModel(null);
  // }
  // deleteDocumentTraces(docId);
  // const documentList = Store.getDocumentList();
  // $documentList.empty();
  // for (const doc of documentList) {
  //   await renderDocumentItem(doc);
  // }
});
document.addEventListener("store:model-deleted", (e) => {
  console.log("EVENT LISTENER: store:model-deleted");
  const modelId = e.detail.modelId;
  removeModelFromList(modelId);
});

/*document.addEventListener("store:active-document-id-changed", async () => {
  console.log("EVENT LISTENER: store:active-document-id-changed");

  const activeDocumentId = Store.getActiveDocumentId();
  if (!activeDocumentId) {
    clearOverlayLayers();
    clearDocumentViewer();
    return;
  } else {
    highlightActiveDocumentItem(activeDocumentId);
    await loadDocument(activeDocumentId);
    rerenderOverlayLayers();
  }
  const activeModelDocumentId = Store.getActiveModelDocumentId();
  if (activeModelDocumentId && activeModelDocumentId != activeDocumentId) {
    Store.setActiveModel(null);
  }
});*/

document.addEventListener("store:active-model-changed", () => {
  console.log("EVENT LISTENER: store:active-model-changed");

  const activeModel = Store.getActiveModel();

  if (!activeModel) {
    clearModelViewer();
  } else {
    showActiveModel(activeModel);
    const activeModelId = Store.getActiveModelId();
    if (activeModelId) {
      highlightActiveModelInList(activeModelId);
      const activeModelDocumentId = Store.getActiveModelDocumentId();
      const activeDocumentId = Store.getActiveDocumentId();
      if (activeModelDocumentId != activeDocumentId) {
        Store.setActiveDocumentId(activeModelDocumentId);
      } else {
        console.log("Highlighting active model selections");
        highlightActiveModelSelections(activeModelId);
      }
    }
  }
});

let db;

const connectDB = () => {
  return new Promise((resolve, reject) => {
    const dbReq = indexedDB.open("MyDB", 1);
    dbReq.onupgradeneeded = function (event) {
      const db = event.target.result;
      // db.deleteObjectStore("models");
      // db.deleteObjectStore("documents");
      // db.deleteObjectStore("traces");
      if (!db.objectStoreNames.contains("documents")) {
        db.createObjectStore("documents", {
          keyPath: "id",
          autoIncrement: true,
        });
      }
      if (!db.objectStoreNames.contains("models")) {
        db.createObjectStore("models", {
          keyPath: "id",
          autoIncrement: true,
        });
      }
      if (!db.objectStoreNames.contains("traces")) {
        const traceStore = db.createObjectStore("traces", {
          keyPath: "id",
          autoIncrement: true,
        });
        traceStore.createIndex("document_id", "document_id", { unique: false });
        traceStore.createIndex("model_id", "model_id", { unique: false });
      }
    };

    dbReq.onsuccess = function (event) {
      db = event.target.result;
      resolve(db);
    };
    dbReq.onerror = function (event) {
      console.error("Database error:", event.target.errorCode);
      reject(event.target.errorCode);
    };
  });
};

// const deleteDocument = async (docId) => {};

const loadTraces = async () => {
  const documentList = Store.getDocumentList();
  for (const doc of documentList) {
    const newTraces = await getTracesByDocumentId(db, doc.id);
    Store.addTraces(newTraces);
  }
};

$(document).ready(async () => {
  await connectDB();
  await loadDocumentList();
  await loadTraces();
  await loadModels();
  const documentList = Store.getDocumentList();
  if (documentList.length) {
    Store.setActiveDocumentId(documentList[documentList.length - 1]?.id);
  }
  console.log("Initialization complete.", Store.state);
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
document.addEventListener("store:active-document-id-changed", async () => {
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
});

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

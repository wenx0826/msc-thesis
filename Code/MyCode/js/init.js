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

const deleteDocument = async (docId) => {
  await deleteDocumentCascadeById(db, docId);
  const docTraces = getDocumentTraces(docId);
  docTraces.forEach((trace) => {
    const modelIndex = models.findIndex((m) => m.id == trace.model_id);
    if (modelIndex !== -1) {
      models.splice(modelIndex, 1);
    }
    const $modelDiv = $modelsArea.find(`div[data-modelid='${trace.model_id}']`);
    $modelDiv.remove();
  });
  if (activeDocId == docId) {
    clearOverlayLayers();
    $documentContent.empty();
    activeDocId = null;
    $generateButton.prop("disabled", true);
  }
  if (getActiveModelDocumentId() == docId) {
    setActiveModel(null);
  }
  deleteDocumentTraces(docId);
};

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
    // setActiveDocument(documentList[documentList.length - 1]?.id);
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

const documentsStore = Store.documents;
const tracesStore = Store.traces;
const activeDocumentStore = Store.activeDocument;
const modelsStore = Store.models;
const activeModelStore = Store.activeModel;

const loadData = async () => {
  const documentList = await API.Document.getDocumentList();
  documentsStore.setDocumentList(documentList);
  documentList.forEach((doc) => {
    renderDocumentItem(doc);
  });
  console.log("Loaded documents:", documentList);
  for (const { id: docId } of documentList) {
    const newTraces = await API.Trace.getTracesByDocumentId(docId);
    console.log("Loaded traces for document", docId, newTraces);
    tracesStore.addTraces(newTraces);
    for (const { model_id: modelId } of newTraces) {
      API.Model.getModelById(modelId).then((model) => {
        modelsStore.addModel(model);
        renderModelInList(model);
      });
    }
  }
  if (documentList.length) {
    activeDocumentStore.setActiveDocumentId(
      documentList[documentList.length - 1]?.id,
    );
  }
};

$(document).ready(async () => {
  await API.init();
  await loadData();
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

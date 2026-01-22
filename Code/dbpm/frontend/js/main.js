const projectStore = window.Store.project;
const documentsStore = window.Store.documents;
const tracesStore = window.Store.traces;
const activeDocumentStore = window.Store.activeDocument;
const modelsStore = window.Store.models;
const activeModelStore = window.Store.activeModel;
let iframeLoaded = false;

function waitForIframe() {
  return new Promise((resolve) => {
    const iframe = document.getElementById("converter-frame");
    if (
      iframe.contentDocument &&
      iframe.contentDocument.readyState === "complete"
    ) {
      iframeLoaded = true;
      resolve();
    } else {
      iframe.addEventListener("load", () => {
        iframeLoaded = true;
        resolve();
      });
    }
  });
}
async function initStores(projectId) {
  API.project
    .getProjectById(projectId)
    .then((project) => projectStore.setProject(project));

  // const documents = await API.Document.getDocuments();
  API.Document.getDocumentsByProjectId(projectId).then((documents) => {
    documentsStore.setDocumentList(documents);
    if (documents.length > 0) {
      activeDocumentStore.setDocumentById(documents[documents.length - 1]?.id);
    }
    console.log("Loaded documents for project:", documents);
  });

  // const documentIds = project.documents || [];
  // if (documentIds.length > 0) {
  //   // documentsStore.state.documentList = [];
  //   // documentsStore.state.documentList = documents;
  // } else {
  //   documentsStore.state.documentList = await API.Document.getDocuments();
  // }
  // //
  // await documentsStore.setDocumentList();

  // const documentList = documentsStore.getDocuments();
  // },
  // projectStore.setProjectById(projectId).then(() => {
  //   console.log("Project data loaded:", projectStore.state);
  // });
  // // Wait for iframe to be ready
  // let modelIds = [];
  // const documentList = await API.Document.getDocuments();
  // documentsStore.setDocumentList(documentList);
  // documentList.forEach((doc) => {
  //   renderDocumentItem(doc);
  // });
  // console.log("Loaded documents:", documentList);
  // for (const { id: docId } of documentList) {
  //   const newTraces = await API.Trace.getTracesByDocumentId(docId);
  //   // console.log("Loaded traces for document", docId, newTraces);
  //   tracesStore.addTraces(newTraces);
  //   modelIds.push(...newTraces.map((trace) => trace.model_id));
  //   // for (const { model_id: modelId } of newTraces) {
  //   //   API.Model.getModelById(modelId).then(async (model) => {
  //   //     await modelsStore.addModel(model);
  //   //     // await renderModelInList(model);
  //   //   });
  //   // }
  // }
  // if (documentList.length) {
  //   activeDocumentStore.setDocumentById(
  //     documentList[documentList.length - 1]?.id,
  //   );
  // }
  // if (!iframeLoaded) {
  //   await waitForIframe();
  // }
  // modelIds.forEach(async (modelId) => {
  //   const model = await API.Model.getModelById(modelId);
  //   modelsStore.addModel(model);
  //   await renderModelInList(model);
  // });
  // const modelIds = Store.models.getAllModelIds();
}

function getProjectIdFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("project_id");
}

$(document).ready(async () => {
  console.log("main.html Starting initialization...", new Date().toISOString());
  console.log("project id from url:", getProjectIdFromURL());
  const projectId = getProjectIdFromURL();
  Store.init(projectId);
  // window.Store.init(projectId);
  // projectStore.setProjectById(projectId);
  const iframe = document.getElementById("converter-frame");
  iframe.addEventListener("load", () => {
    iframeLoaded = true;
  });
  // const projectId = getProjectIdFromURL();
  console.log("Setting project id in store:", projectId);
  console.log("Initialization complete.", window.Store);
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

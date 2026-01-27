const workspaceStore = window.Store.workspace;
const projectStore = window.Store.project;
const documentsStore = window.Store.documents;
const tracesStore = window.Store.traces;
const activeDocumentStore = window.Store.activeDocument;
const modelsStore = window.Store.models;
const activeModelStore = window.Store.activeModel;

const MODEL_UPDATE_TYPE = window.Constants.MODEL_UPDATE_TYPE;
let projectId;
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

function getProjectIdFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("project_id");
}

$(document).ready(async () => {
  console.log("main.html Starting initialization...", new Date().toISOString());
  console.log("project id from url:", getProjectIdFromURL());
  projectId = getProjectIdFromURL();
  workspaceService.loadWorkspace(projectId);

  const statsLink = $("#statsLink")[0];
  if (statsLink) {
    statsLink.href = "stats.html" + window.location.search;
  }
  const logLink = $("#logLink")[0];
  const urlParams = new URLSearchParams(window.location.search);
  logLink.href = "/data/logs/" + projectId + ".yaml";

  // Store.init(projectId);
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

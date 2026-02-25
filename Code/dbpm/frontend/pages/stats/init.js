import "./ui/index.js";
// import { createUI } from "../../../shared/util/ui.js";

// import { documentsAPI, projectsAPI } from "../../../api/index.js";
// import {
//   getProjectIdFromURL,
//   getProjectWorkspaceURL,
//   getDocumentURL,
// } from "../../../shared/util/url.js";
// import store from "./store.js";
// // import { $cloneTemplate } from "../../../shared/util/dom.js";
// const projectId = getProjectIdFromURL();
// store.setProjectId(projectId);

// async function renderDocumentModels(documentId, $documentItem) {
//   // const $documentItem = $(`li[data-doc-id='${documentId}']`);
//   const $modelsGrid = $documentItem.find("[data-ref='modelsGrid']");
//   console.log(
//     "Rendering models for document ID:",
//     documentId,
//     $documentItem,
//     $documentItem.length,
//     $modelsGrid,
//     $modelsGrid.length,
//   );
//   const models = await documentsAPI.getDisplayedModelsById(documentId);

//   for (const model of models) {
//     const $modelItem = $cloneTemplate("modelGridTemplate").children().first();
//     $modelItem.attr("data-model-id", model.id);
//     $modelItem
//       .find("[data-ref='modelName']")
//       .text(model.name || "Unnamed Model");
//     $modelsGrid.append($modelItem);
//   }
//   console.log("Fetched models for document:", documentId, models);
// }

// async function renderDocumentsList() {
//   try {
//     const docs = await documentsAPI.getAllByProjectId(projectId);
//     const $documentsList = $("#documentsList");

//     for (const doc of docs) {
//       const $documentItem = $cloneTemplate("documentItemTemplate")
//         .children()
//         .first();
//       $documentItem.find("li").attr("data-doc-id", doc.id);
//       $documentItem
//         .find("[data-ref='documentName']")
//         .text(doc.name || "Unnamed Document");
//       $documentItem
//         .find("[data-ref='documentLink']")
//         .attr("href", getDocumentURL(doc.id));
//       $documentsList.append($documentItem);
//       renderDocumentModels(doc.id, $documentItem);
//     }
//   } catch (error) {
//     console.error("Error initializing stats:", error);
//   }
// }

// createUI({
//   setup: () => {
//     // const
//     // renderDocumentsList();
//   },
//   bindListeners: () => {},
// });

// UI Index - Re-exports all UI modules and provides initialization
import { initHeaderUI } from "./header.js";
import { initDocumentsUI } from "./documents.ui.js";
import { initActiveDocumentUI } from "./activeDocument.ui.js";
import { initModelsUI } from "./models.ui.js";
import { initActiveModelUI } from "./activeModel.ui.js";
import { initActiveModelDetailsUI } from "./activeModelDetails.js";
import { initProjectGraphUI } from "./projectGraph.ui.js";

/**
 * Initialize all UI components
 * Should be called after stores and services are initialized
 * and after the DOM is ready
 */
export function initAllUI() {
  initHeaderUI();
  initDocumentsUI();
  initActiveDocumentUI();
  initActiveModelUI();
  initActiveModelDetailsUI();
  initModelsUI();
  initProjectGraphUI();
  console.log("All UI components initialized");
}

// Export individual init functions for granular control

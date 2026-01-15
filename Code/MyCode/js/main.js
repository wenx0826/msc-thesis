document.addEventListener("store:active-document-id-changed", async () => {
  console.log("Active document ID changed:", Store.getActiveDocumentId());
  await loadDocument();
  rerenderTracesLayer();
});

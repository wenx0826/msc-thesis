//TODOs
// on LLM model select change, set Store llmModel
projectStore.subscribe((state, { key, oldValue, newValue }) => {
  if (key === "name") {
    changeProjectName(newValue);
  }
});

function changeProjectName(name) {
  console.log("Changing project name display to:", name);
  $("#projectName").text(name || "Unnamed Project");
}

// Initialize project display
// changeProjectId(projectStore.state.id);
// changeProjectName(projectStore.state.name);

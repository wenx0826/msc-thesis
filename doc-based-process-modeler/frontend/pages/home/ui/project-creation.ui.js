import { createUI } from "../../../shared/utils/ui.js";
import { getProjectWorkspaceURL } from "../../../shared/utils/url.js";
import { projectsAPI } from "../../../api/index.js";

const $dialog = $("#projectCreationDialog");
const $form = $dialog.find("form");
const $nameInput = $("#name");
const $error = $("#error");
const $cancelButton = $("#cancel");
const $submitButton = $("#create");
const dialog = $dialog[0];
const form = $form[0];

async function createProject(name) {
  return projectsAPI.create({ name });
}

function setError(message = "") {
  $error.text(message);
}

function getProjectName() {
  return String($nameInput.val() || "").trim();
}

function setSubmitting(isSubmitting) {
  $submitButton.prop("disabled", isSubmitting);
}

function resetDialog() {
  form.reset();
  setError("");
  setSubmitting(false);
}

function openDialog() {
  resetDialog();
  if (!dialog.open) {
    dialog.showModal();
  }
  $nameInput.trigger("focus");
}

function closeDialog() {
  if (dialog.open) {
    dialog.close();
  }
}

function validateProjectName() {
  const name = getProjectName();
  if (name) {
    return name;
  }
  setError("Name is required.");
  $nameInput.trigger("focus");
  return null;
}

createUI({
  bindListeners: () => {
    $("#createProjectButton").on("click", openDialog);
    $cancelButton.on("click", closeDialog);
    $nameInput.on("input", () => {
      setError("");
    });
    $form.on("submit", async (event) => {
      event.preventDefault();
      const name = validateProjectName();
      if (!name) {
        return;
      }

      setError("");
      setSubmitting(true);

      try {
        const project = await createProject(name);
        window.location.href = getProjectWorkspaceURL(project.id);
      } catch (error) {
        setError(error?.message || "Failed to create project.");
        setSubmitting(false);
      }
    });
  },
});

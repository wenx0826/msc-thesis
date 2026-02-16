import { projectsAPI } from "../../../api/index.js";
import { getProjectWorkspaceURL } from "../../../shared/util/url.js";

const dlg = document.getElementById("projectCreationDialog");
const $err = $("#err");
const $name = $("#name");
const $save = $("#save");

async function createProject(name) {
  const project = await projectsAPI.create({ name });
  return project;
}

$("#btnCreate").on("click", () => {
  $err.text("");
  $name.val("");
  dlg.showModal();
  $name.trigger("focus");
});

$("#cancel").on("click", () => {
  dlg.close();
});

$("#form").on("submit", async (e) => {
  e.preventDefault();
  const name = $name.val().trim();
  $err.text("");

  if (!name) {
    $err.text("Name is required.");
    return;
  }

  $save.prop("disabled", true);

  try {
    const project = await createProject(name);
    window.location.href = getProjectWorkspaceURL(project.id);
  } catch (err) {
    $err.text(err.message);
    $save.prop("disabled", false);
  }
});

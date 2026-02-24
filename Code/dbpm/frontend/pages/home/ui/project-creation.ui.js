import { createUI } from "../../../shared/utils/ui.js";
import { getProjectWorkspaceURL } from "../../../shared/utils/url.js";
import { projectsAPI } from "../../../api/index.js";

const $dialog = $("#projectCreationDialog");
const $form = $dialog.find("form");
const $name = $("#name");
const $submitBtn = $form.find("button[type='submit']");
const $err = $("#err");

async function createProject(name) {
  const project = await projectsAPI.create({ name });
  return project;
}

createUI({
  setup: () => {},
  bindListeners: () => {
    $("#createProjectButton").on("click", () => {
      $err.text("");
      $name.val("");
      $dialog[0].showModal();
      $name.trigger("focus");
    });

    $("#cancel").on("click", () => {
      $dialog[0].close();
    });

    $form.on("submit", async (e) => {
      e.preventDefault();
      const name = $name.val().trim();
      $err.text("");

      if (!name) {
        $err.text("Name is required.");
        return;
      }

      $submitBtn.prop("disabled", true);

      try {
        const project = await createProject(name);
        window.location.href = getProjectWorkspaceURL(project.id);
      } catch (err) {
        $err.text(err.message);
        $submitBtn.prop("disabled", false);
      }
    });
  },
});

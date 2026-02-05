// Projects UI Module - Handles project list and create dialog
import { projectsAPI } from "../api/index.js";

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );
}

function renderProject(project) {
  const $table = $("#projectTable");
  const $row = $($("#rowtemplate").html());

  $row
    .find("a")
    .attr("href", "workspace.html?project_id=" + encodeURIComponent(project.id))
    .text(escapeHtml(project.name));
  $row.find(".doc-count").text(project.documentCount || 0);
  $row.find(".model-count").text(project.modelCount || 0);

  $table.append($row);
}

async function loadProjects() {
  try {
    const projects = await projectsAPI.getProjectList();
    console.log("Loaded projects:", projects);

    for (const project of projects) {
      project.documentCount = await projectsAPI.getDocumentCount(project.id);
      project.modelCount = await projectsAPI.getModelCount(project.id);
      renderProject(project);
    }
  } catch (err) {
    console.error("Failed to load projects:", err);
  }
}

async function createProject(name) {
  const project = await projectsAPI.createProject({ name });
  return project;
}

function setupCreateProjectDialog() {
  const dlg = document.getElementById("dlg");
  const $err = $("#err");
  const $name = $("#name");
  const $save = $("#save");

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
      window.location.assign(
        "workspace.html?project_id=" + encodeURIComponent(project.id),
      );
    } catch (err) {
      $err.text(err.message);
      $save.prop("disabled", false);
    }
  });
}

export function initProjectsUI() {
  loadProjects();
  setupCreateProjectDialog();
  [];
  console.log("Projects UI loaded", $("#projectTable")[0]);
  $("#projectTable").on("click", (e) => {
    console.log("Project row clicked", e.target);
    var menu = {};
    // var name = $(e.currentTarget)
    //   .parents("tr")
    //   .find("td[data-class=name]")
    //   .attr("data-full-name");
    // var is_model =
    //   $(e.currentTarget).parents("tr").find("td[data-class=model]").length > 0
    //     ? true
    //     : false;
    // menu["Operations"] = [
    //   {
    //     label: "Delete",
    //     function_call: delete_it,
    //     text_icon: "❌",
    //     type: undefined,
    //     params: [name],
    //   },
    //   {
    //     label: "Rename",
    //     function_call: rename_it,
    //     type: undefined,
    //     text_icon: "📛",
    //     params: [name],
    //   },
    // ];
    // if (name.match(/\.xml$/)) {
    //   menu["Operations"].unshift({
    //     label: "Duplicate",
    //     function_call: duplicate_it,
    //     text_icon: "➕",
    //     type: undefined,
    //     params: [name],
    //   });
    // }
    // if (shifts.length > 0 && is_model) {
    //   menu["Shifting"] = [];
    //   shifts.forEach((ele) => {
    //     menu["Shifting"].push({
    //       label: "Shift to " + ele,
    //       function_call: shift_it,
    //       text_icon: "➔",
    //       type: undefined,
    //       params: [name, ele],
    //     });
    //   });
    // }
    new CustomMenu(e).contextmenu(menu);
  });
  console.log("Projects UI initialized");
}

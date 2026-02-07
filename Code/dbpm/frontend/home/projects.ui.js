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

function renderProjectRow(project) {
  const $table = $("#projectTable");
  const $row = $($("#rowtemplate").html());
  $row.attr("data-project-id", project.id);
  $row
    .find("a")
    .attr("href", "workspace.html?project_id=" + project.id)
    .text(escapeHtml(project.name));
  $row.find(".doc-count").text(project.documentCount || 0);
  $row.find(".model-count").text(project.modelCount || 0);
  $row.find(".created").text(new Date(project.createdAt).toLocaleString());
  $table.append($row);
}

async function loadProjects() {
  try {
    const projects = await projectsAPI.getProjectList();
    console.log("Loaded projects:", projects);

    for (const project of projects) {
      project.documentCount = await projectsAPI.getDocumentCount(project.id);
      project.modelCount = await projectsAPI.getModelCount(project.id);

      renderProjectRow(project);
    }
  } catch (err) {
    console.error("Failed to load projects:", err);
  }
}

async function createProject(name) {
  const project = await projectsAPI.createProject({ name });
  return project;
}

function deleteProject(projectId) {}

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
function viewProjectStats(projectId) {
  window.location.assign(
    "stats.html?project_id=" + encodeURIComponent(projectId),
  );
}

export default function init() {
  loadProjects();
  setupCreateProjectDialog();
  console.log("Projects UI loaded", $("#projectTable")[0]);
  $("#projectTable").on("click", "td.actions", (e) => {
    console.log("Project row clicked", e.target, e.currentTarget);
    var projectId = $(e.currentTarget).closest("tr").attr("data-project-id");
    var menu = {};
    menu[""] = [
      {
        label: "View Statistics",
        function_call: viewProjectStats,
        text_icon: "",
        type: undefined,
        params: [projectId],
      },
      {
        label: "View Log",
        function_call: deleteProject,
        text_icon: "",
        type: undefined,
        params: [projectId],
      },
      {
        label: "Download Log",
      },
      {
        label: "Delete",
        function_call: deleteProject,
        text_icon: "",
        type: undefined,
        params: [projectId],
      },
    ];

    new CustomMenu(e).contextmenu(menu);
  });
  console.log("Projects UI initialized");
}

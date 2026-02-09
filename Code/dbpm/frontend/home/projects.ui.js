// Projects UI Module - Handles project list and create dialog
import { projectsAPI } from "../api/index.js";
import { getProjectWorkspaceURL, getProjectStatsURL } from "../util/url.js";
import { cloneTemplate } from "../util/dom.js";

let projects = [];

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

async function renderProjectsTable() {
  try {
    projects = await projectsAPI.list();
    for (const project of projects) {
      const $tableBody = $("#projectsTable tbody");
      const $row = cloneTemplate("projectRowTemplate").children().first();
      console.log("Rendering project:", $row);
      $row.attr("data-project-id", project.id);
      $row.find("[data-ref='projectName']").text(project.name || "no name");
      $row
        .find("[data-ref='documentsCount']")
        .text(project.documentsCount || 0);
      $row.find("[data-ref='modelsCount']").text(project.modelsCount || 0);
      $row.find("[data-ref='createdAt']").text(project.createdAt);
      $tableBody.append($row);
    }
  } catch (err) {
    console.error("Failed to initialize Projects UI:", err);
  }
}

async function createProject(name) {
  const project = await projectsAPI.createProject({ name });
  return project;
}

function deleteProject(projectId) {}

function setupProjectCreationDialog() {
  const dlg = document.getElementById("projectCreationDialog");
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

export default async function init() {
  renderProjectsTable();
  setupProjectCreationDialog();
  $("#projectsTable tbody").on("click", "td:first-child", (e) => {
    var projectId = $(e.currentTarget).closest("tr").attr("data-project-id");
    window.location.href = getProjectWorkspaceURL(projectId);
  });
  $("#projectsTable tbody").on("click", "td:last-child", (e) => {
    var projectId = $(e.currentTarget).closest("tr").attr("data-project-id");
    var menu = {};
    menu[""] = [
      {
        label: "View Statistics",
        function_call: (projectId) =>
          (window.location.href = getProjectStatsURL(projectId)),
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
}

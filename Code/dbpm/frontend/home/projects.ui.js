// Projects UI Module - Handles project list and create dialog
import { projectsAPI } from "../api/index.js";
import {
  getProjectWorkspaceURL,
  getProjectStatsURL,
  getProjectLogURL,
} from "../util/url.js";

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
    const data = projects.map((project) => [
      project.name || "no name",
      project.documentsCount || 0,
      project.modelsCount || 0,
      project.createdAt,
      "...",
    ]);
    $("#projectsTable").DataTable({
      data: data,
      order: [[3, "asc"]],
      columnDefs: [
        {
          orderable: false,
          targets: -1,
        },
      ],
      columns: [
        { title: "Name", className: "clickable" },
        { title: "Documents", className: "col-num" },
        { title: "Models", className: "col-num" },
        { title: "Created", className: "col-date" },
        { title: "Actions", className: "col-button" },
      ],

      createdRow: function (row, data, dataIndex) {
        $(row).attr("data-project-id", projects[dataIndex].id);
      },
      destroy: true,
      paging: true,
      searching: true,
      info: true,
    });
  } catch (err) {
    console.error("Failed to initialize Projects UI:", err);
  }
}

async function createProject(name) {
  const project = await projectsAPI.create({ name });
  return project;
}

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

function downloadProjectLog(projectId, projectName) {
  const url = getProjectLogURL(projectId);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${projectName}.yaml`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
function renameProject(projectId, $projectNameCell) {
  const currentName = $projectNameCell.text();
  const newName = prompt("Enter new project name:", currentName);
  if (newName && newName.trim() !== "" && newName !== currentName) {
    projectsAPI
      .update(projectId, { name: newName })
      .then((updatedProject) => {
        $projectNameCell.text(updatedProject.name);
      })
      .catch((err) => {
        console.error("Failed to rename project:", err);
        alert("Failed to rename project: " + err.message);
      });
  } else {
    alert("Project name cannot be empty.");
  }
}
function deleteProject(projectId) {}

export default async function init() {
  renderProjectsTable();
  setupProjectCreationDialog();
  $("#projectsTable tbody").on("click", "td:first-child", (e) => {
    var projectId = $(e.currentTarget).closest("tr").attr("data-project-id");
    window.location.href = getProjectWorkspaceURL(projectId);
  });
  $("#projectsTable tbody").on("click", "td:last-child", (e) => {
    const $tr = $(e.currentTarget).closest("tr");

    const projectId = $tr.attr("data-project-id");
    const projectName = $tr.children("td:first-child").text();
    const $projectNameCell = $tr.children("td:first-child");
    const menu = {};
    menu[""] = [
      {
        label: "View Statistics",
        function_call: (projectId) =>
          (window.location.href = getProjectStatsURL(projectId)),
        text_icon: undefined,
        type: undefined,
        params: [projectId],
      },
      {
        label: "View Log",
        function_call: (projectId) => {
          window.open(getProjectLogURL(projectId), "_blank");
        },
        text_icon: undefined,
        type: undefined,
        params: [projectId],
      },
      {
        label: "Download Log",
        function_call: downloadProjectLog,
        text_icon: undefined,
        type: undefined,
        params: [projectId, projectName],
      },
      {
        label: "Rename Project",
        function_call: renameProject,
        text_icon: undefined,
        type: undefined,
        params: [projectId, $projectNameCell],
      },
      {
        label: "Delete Project",
        function_call: deleteProject,
        text_icon: undefined,
        type: undefined,
        params: [projectId],
      },
    ];

    new CustomMenu(e).contextmenu(menu);
  });
}

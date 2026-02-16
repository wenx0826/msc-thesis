// Projects UI Module - Handles project list and create dialog
import { projectsAPI } from "../../../api/index.js";
import {
  getProjectWorkspaceURL,
  getProjectStatsURL,
  getProjectLogURL,
} from "../../../shared/util/url.js";
import initInlineEditor from "../../../shared/ui/inlineEditor.js";

let projects = [];

const $projectsTable = $("#projectsTable");

const projectNameEditor = initInlineEditor({
  $scope: $projectsTable,
  onSave: (name, $view) => {
    console.log("Saving project name:", name);
    const projectId = $view.closest("tr").attr("data-project-id");
    projectsAPI.update(projectId, { name });
  },
});
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
        {
          title: "Name",
          className: "clickable",
          render: function (data, type, row) {
            return `<span class="inline-editor__view">${data}</span>`; // Wrap name in a span for inline editing
          },
        },
        { title: "Documents", className: "col-num" },
        { title: "Models", className: "col-num" },
        { title: "Created", className: "col-date" },
        {
          title: "Actions",
          render: function () {
            return `<button class="action-btn">...</button>`; // Action button for context menu
          },
        },
      ],

      createdRow: function (row, data, dataIndex) {
        const projectId = projects[dataIndex].id;
        $(row).attr("data-project-id", projectId);
        // $(row).find(".inline-editor__view").attr("data-id", projectId);
      },
      destroy: true,
      paging: true,
      searching: true,
      info: true,
      autoWidth: false,
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
// function renameProject(projectId, $projectNameCell) {
//   const currentName = $projectNameCell.text();
//   const newName = prompt("Enter new project name:", currentName);
//   if (newName && newName.trim() !== "" && newName !== currentName) {
//     projectsAPI
//       .update(projectId, { name: newName })
//       .then((updatedProject) => {
//         $projectNameCell.text(updatedProject.name);
//       })
//       .catch((err) => {
//         console.error("Failed to rename project:", err);
//         alert("Failed to rename project: " + err.message);
//       });
//   } else {
//     alert("Project name cannot be empty.");
//   }
// }

function deleteProject(projectId) {}

export default async function init() {
  renderProjectsTable();
  setupProjectCreationDialog();

  // $projectsTable.on("click", "td:first-child", (e) => {
  //   const $td = $(e.currentTarget);
  //   const projectId = $td.closest("tr").attr("data-project-id");
  //   console.log("Project name cell clicked for projectId:", projectId);
  //   console.log("Project name :", $td.find(".inline-editor__input").length > 0);

  //   window.location.href = getProjectWorkspaceURL(projectId);
  // });
  $projectsTable.on("mousedown", "td:first-child", (e) => {
    const $td = $(e.currentTarget);
    const projectId = $td.closest("tr").attr("data-project-id");
    window.location.href = getProjectWorkspaceURL(projectId);
  });

  $projectsTable.on("click", "td:last-child", (e) => {
    // const $td = ;
    const $tr = $(e.currentTarget).parent();
    const projectId = $tr.data("projectId");
    console.log("Actions clicked for projectId:", projectId);
    const $projectNameView = $tr.find(".inline-editor__view");
    const projectName = $projectNameView.text();
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
        function_call: ($view) =>
          setTimeout(() => projectNameEditor.startEdit($view), 0),
        text_icon: undefined,
        type: undefined,
        params: [$projectNameView],
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

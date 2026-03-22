import { createUI } from "../../../shared/utils/ui.js";
import {
  getProjectWorkspaceURL,
  getProjectStatsURL,
  getProjectLogURL,
} from "../../../shared/utils/url.js";
import { createMenu } from "../../../shared/utils/dom.js";
import initInlineEditor from "../../../shared/widgets/inline-editor.js";
import { projectsAPI } from "../../../api/index.js";

const $projectsTable = $("#projectsTable");
let projectNameEditor;

// #regin DOM Manipulation and Rendering
async function renderProjectsTable() {
  try {
    const projects = await projectsAPI.list();
    const data = projects.map((project) => [
      project.name || "no name",
      project.documentsCount || 0,
      project.modelsCount || 0,
      project.createdAt,
      "",
    ]);
    $projectsTable.DataTable({
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
            return `<button class="more-actions-btn"></button>`; // Action button for context menu
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
function getProjectRow(projectId) {
  return $projectsTable.find(`tr[data-project-id='${projectId}']`);
}
// #endregion

// #region Actions
function viewProjectStats(projectId) {
  window.location.href = getProjectStatsURL(projectId);
}
function viewProjectLog(projectId) {
  window.open(getProjectLogURL(projectId), "_blank");
}
function downloadProjectLog(projectId) {
  const projectName = getProjectRow(projectId).find("td:first-child").text();
  const url = getProjectLogURL(projectId);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${projectName}.yaml`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function deleteProject(projectId) {
  try {
    await projectsAPI.delete(projectId);
    const table = $projectsTable.DataTable();
    const $row = getProjectRow(projectId);
    if ($row.length) {
      table.row($row).remove().draw(false);
    }
  } catch (err) {
    console.error("Failed to delete project:", err);
  }
}

function renameProject(projectId) {
  const $projectRow = getProjectRow(projectId);
  const $projectNameView = $projectRow.find(".inline-editor__view");
  setTimeout(() => projectNameEditor.startEdit($projectNameView), 0);
}

function getActionsMenu(projectId) {
  const menu = {};
  menu[""] = [
    {
      label: "View statistics",
      function_call: viewProjectStats,
      text_icon: undefined,
      type: undefined,
      params: [projectId],
    },
    {
      label: "View log",
      function_call: viewProjectLog,
      text_icon: undefined,
      type: undefined,
      params: [projectId],
    },
    {
      label: "Download log",
      function_call: downloadProjectLog,
      text_icon: undefined,
      type: undefined,
      params: [projectId],
    },
    {
      label: "Rename project",
      function_call: renameProject,
      text_icon: undefined,
      type: undefined,
      params: [projectId],
    },
    {
      label: "Delete project",
      function_call: deleteProject,
      text_icon: undefined,
      type: undefined,
      params: [projectId],
    },
  ];
  return menu;
}
// #endregion

createUI({
  setup: () => {
    renderProjectsTable();
    projectNameEditor = initInlineEditor({
      $scope: $projectsTable,
      onSave: (name, $view) => {
        const projectId = $view.closest("tr").data("projectId");
        projectsAPI.update(projectId, { name });
      },
    });
  },
  bindListeners: () => {
    $projectsTable.on("mousedown", "td:first-child", (e) => {
      const projectId = $(e.currentTarget).closest("tr").data("projectId");
      window.location.href = getProjectWorkspaceURL(projectId);
    });

    $projectsTable.on("click", "td:last-child", (e) => {
      const projectId = $(e.currentTarget).closest("tr").data("projectId");
      const menu = getActionsMenu(projectId);
      createMenu(e, menu, { noIcons: true });
    });
  },
});

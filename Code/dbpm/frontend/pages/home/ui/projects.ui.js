import { createUI } from "../../../shared/util/ui.js";
import {
  getProjectWorkspaceURL,
  getProjectStatsURL,
  getProjectLogURL,
} from "../../../shared/util/url.js";
import initInlineEditor from "../../../shared/widgets/inlineEditor.js";
import { projectsAPI } from "../../../api/index.js";

const $projectsTable = $("#projectsTable");

function viewProjectStats(projectId) {
  window.location.href = getProjectStatsURL(projectId);
}
function viewProjectLog(projectId) {
  window.open(getProjectLogURL(projectId), "_blank");
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
function renameProject(projectNameEditor, $view) {
  setTimeout(() => projectNameEditor.startEdit($view), 0);
}
function deleteProject(projectId) {}

async function renderProjectsTable() {
  try {
    const projects = await projectsAPI.list();
    const data = projects.map((project) => [
      project.name || "no name",
      project.documentsCount || 0,
      project.modelsCount || 0,
      project.createdAt,
      "...",
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

createUI({
  setup: () => {
    const projectNameEditor = initInlineEditor({
      $scope: $projectsTable,
      onSave: (name, $view) => {
        console.log("Saving project name:", name);
        const projectId = $view.closest("tr").data("projectId");
        projectsAPI.update(projectId, { name });
      },
    });
    renderProjectsTable();
    return { projectNameEditor };
  },
  bindListeners: ({ projectNameEditor }) => {
    $projectsTable.on("mousedown", "td:first-child", (e) => {
      const $td = $(e.currentTarget);
      const projectId = $td.closest("tr").data("projectId");
      window.location.href = getProjectWorkspaceURL(projectId);
    });

    $projectsTable.on("click", "td:last-child", (e) => {
      // const $td = ;
      const $tr = $(e.currentTarget).parent();
      const projectId = $tr.data("projectId");
      const $projectNameView = $tr.find(".inline-editor__view");
      const projectName = $projectNameView.text();
      const menu = {};
      menu[""] = [
        {
          label: "View Statistics",
          function_call: viewProjectStats,
          text_icon: undefined,
          type: undefined,
          params: [projectId],
        },
        {
          label: "View Log",
          function_call: viewProjectLog,
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
          params: [projectNameEditor, $projectNameView],
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
  },
});

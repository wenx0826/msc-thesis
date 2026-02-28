export function getProjectIdFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("project_id");
}

export function getProjectStatsURL(projectId) {
  return `stats.html?project_id=${projectId}`;
}

export function getProjectWorkspaceURL(projectId) {
  return `workspace.html?project_id=${projectId}`;
}

export function getProjectLogURL(projectId) {
  return `data/logs/${projectId}.yaml`;
}

export function getDocumentURL(versionId) {
  return `data/documents/${versionId}.html`;
}
export function getModelURL(versionId) {
  return `data/models/${versionId}.html`;
}

export function getModelGraphRenderURL(modelVersionId) {
  if (!modelVersionId) {
    return "pages/workspace/workflow/graph-render.html";
  }
  const versionId = encodeURIComponent(modelVersionId);
  return `pages/workspace/workflow/graph-render.html?model_version_id=${versionId}`;
}

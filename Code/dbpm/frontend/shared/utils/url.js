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

export function getDocumentViewerURL(versionId) {
  if (!versionId) {
    return "document-viewer.html";
  }
  return `document-viewer.html?version_id=${versionId}`;
}

// Backward compatibility for existing imports.
export function getDocumentRenderURL(versionId) {
  return getDocumentViewerURL(versionId);
}
export function getModelURL(versionId) {
  return `data/models/${versionId}.xml`;
}

export function getWorkflowViewerURL(modelVersionId) {
  if (!modelVersionId) {
    return "workflow-viewer.html";
  }
  const versionId = encodeURIComponent(modelVersionId);
  return `workflow-viewer.html?model_version_id=${versionId}`;
}

// Backward compatibility for existing imports.
export function getModelGraphRenderURL(modelVersionId) {
  return getWorkflowViewerURL(modelVersionId);
}

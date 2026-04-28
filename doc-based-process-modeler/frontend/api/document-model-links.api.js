import { baseURL, handleResponse } from "./base.js";

function encodePathSegment(value) {
  return encodeURIComponent(value);
}

export default {
  path: "document-model-links",

  async getLatestLinksByDocumentVersionId(versionId, options = {}) {
    const { includeDeletedModels = false } = options;
    const encodedVersionId = encodePathSegment(versionId);
    const params = new URLSearchParams();
    if (includeDeletedModels) {
      params.set("includeDeletedModels", "true");
    }
    const suffix = params.toString() ? `?${params.toString()}` : "";
    const response = await fetch(
      `${baseURL}/${this.path}/document-versions/${encodedVersionId}${suffix}`,
    );
    return handleResponse(
      response,
      "Failed to fetch latest links by document version",
    );
  },

  async getLatestLinkByModelVersionId(modelVersionId) {
    const encodedModelVersionId = encodePathSegment(modelVersionId);
    const response = await fetch(
      `${baseURL}/${this.path}/model-versions/${encodedModelVersionId}/latest`,
    );
    return handleResponse(
      response,
      "Failed to fetch latest link by model version",
    );
  },

  async updateLink(updatedLink) {
    const { id, ...updates } = updatedLink;

    const encodedLinkId = encodePathSegment(id);
    const response = await fetch(`${baseURL}/${this.path}/${encodedLinkId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    return handleResponse(response, "Failed to update link");
  },

  async createSelection(linkId, selection) {
    const encodedLinkId = encodePathSegment(linkId);
    const response = await fetch(
      `${baseURL}/${this.path}/${encodedLinkId}/selections`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selection),
      },
    );
    return handleResponse(response, "Failed to create selection");
  },

  async updateSelection(linkId, selectionId, updates) {
    const encodedLinkId = encodePathSegment(linkId);
    const encodedSelectionId = encodePathSegment(selectionId);
    const response = await fetch(
      `${baseURL}/${this.path}/${encodedLinkId}/selections/${encodedSelectionId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      },
    );
    return handleResponse(response, "Failed to update selection");
  },

  async deleteSelection(linkId, selectionId) {
    const encodedLinkId = encodePathSegment(linkId);
    const encodedSelectionId = encodePathSegment(selectionId);
    const response = await fetch(
      `${baseURL}/${this.path}/${encodedLinkId}/selections/${encodedSelectionId}`,
      {
        method: "DELETE",
      },
    );
    return handleResponse(response, "Failed to delete selection");
  },
};

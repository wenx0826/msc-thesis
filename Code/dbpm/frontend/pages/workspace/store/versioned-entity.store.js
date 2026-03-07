import { EntitiesStore } from "./entities.store.js";

export class VersionedEntityStore extends EntitiesStore {
  constructor({ initialState = {} } = {}) {
    super({
      initialState,
    });
  }
  getVersions(id) {
    return this.getEntity(id)?.versions || [];
  }
  getVersion(docId, versionId) {
    const versions = this.getVersions(docId);
    const version = versions.find((item) => item.id === versionId);
    return version;
  }
  getLatestVersionId(id) {
    return this.getEntity(id)?.latestVersionId;
  }

  getLatestVersion(id) {
    const entity = this.getEntity(id);
    const versions = entity?.versions || [];
    const latestVersionId = entity?.latestVersionId;
    if (!latestVersionId) {
      return versions.at(-1) || null;
    }
    return versions.find((item) => item.id === latestVersionId) || null;
  }
  isLatestVersion(id, versionId) {
    const latestVersionId = this.getLatestVersionId(id);
    return versionId === latestVersionId;
  }
  getLatestVersionName(id) {
    return this.getLatestVersion(id)?.name;
  }
  addVersion(id, value) {
    const entity = this.getEntity(id);
    if (!entity) {
      return null;
    }
    if (!Array.isArray(entity.versions)) {
      entity.versions = [];
    }
    entity.versions.push(value);
    entity.latestVersionId = value.id;
    this.notify({
      key: "entitiesById.versions",
      operation: "add",
      value,
    });
    return value;
  }
}

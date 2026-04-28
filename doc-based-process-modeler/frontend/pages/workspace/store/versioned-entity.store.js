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

  isLatestVersion(id, versionId) {
    const latestVersionId = this.getLatestVersionId(id);
    return versionId === latestVersionId;
  }
  getLatestVersion(id) {
    const entity = this.getEntity(id);
    return entity.versions.at(-1);
  }
  getLatestVersionName(id) {
    return this.getLatestVersion(id).name;
  }
  addVersion(id, value) {
    const entity = this.getEntity(id);
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

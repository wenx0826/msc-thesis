import { Store } from "../../../shared/utils/store.js";

export class VersionedEntityStore extends Store {
  constructor({ initialState = {} } = {}) {
    super({
      ...initialState,
      entitiesById: {},
    });
  }

  init(entities) {
    const entitiesById = {};
    entities.forEach((entity) => {
      entity.latestVersion = entity.versions?.at(-1);
      entitiesById[entity.id] = entity;
    });
    this.state.entitiesById = entitiesById;
    this.notify({ operation: "init", value: entities });
  }
  getList() {
    return Object.values(this.state.entitiesById);
  }
  add(entity) {
    entity.latestVersion = entity.versions?.at(-1);
    this.state.entitiesById[entity.id] = entity;
    this.notify({ operation: "add", value: entity });
    return entity;
  }
  updateName(id, newName) {
    const entity = this.getEntity(id);
    entity.name = newName;
    this.notify({ operation: "update.name", value: entity });
    return entity;
  }
  delete(id) {
    if (!id) return null;
    const value = this.state.entitiesById[id] || null;
    delete this.state.entitiesById[id];
    this.notify({ operation: "delete", value });
    return value;
  }

  getCount() {
    return Object.keys(this.state.entitiesById).length;
  }

  getEntity(id) {
    return this.state.entitiesById[id] || null;
  }

  getVersions(id) {
    return this.getEntity(id)?.versions || [];
  }
  getVersionName(versions, versionId) {
    const version = versions.find((item) => item.id === versionId);
    return version ? version.name : null;
  }

  getVersionDisplayName(id, versionId) {
    const entity = this.getEntity(id);
    const versionName = this.getVersionName(entity.versions, versionId);
    return `${entity.name} - ${versionName}`;
  }

  getLatestVersion(id) {
    return this.getEntity(id)?.latestVersion ?? {};
  }

  getLatestVersionId(id) {
    return this.getEntity(id)?.latestVersionId;
  }

  addVersion(id, value) {
    const entity = this.getEntity(id);
    entity.versions.push(value);
    entity.latestVersion = value;
    entity.latestVersionId = value.id;
    this.notify({ operation: "versions.add", value });
    return value;
  }

  updateVersion(id, value) {
    if (!id) return null;
    const entity = this.getEntity(id);
    if (!entity || !Array.isArray(entity.versions)) return null;
    const versionIndex = entity.versions.findIndex(
      (item) => item.id === value.id,
    );
    if (versionIndex === -1) return null;
    entity.versions[versionIndex] = value;
    return value;
  }
}

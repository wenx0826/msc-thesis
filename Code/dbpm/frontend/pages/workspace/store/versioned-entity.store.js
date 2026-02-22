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
    entities = Array.isArray(entities) ? entities : [];
    entities.forEach((entity) => {
      if (!entity?.id) return;
      entitiesById[entity.id] = entity;
    });
    this.state.entitiesById = entitiesById;
    this.notify({ operation: "init", value: entities });
  }

  add(value) {
    if (!value?.id) return null;
    this.state.entitiesById[value.id] = value;
    this.notify({ operation: "add", value });
    return value;
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

  getList() {
    return Object.values(this.state.entitiesById);
  }

  getVersions(id) {
    return this.getEntity(id)?.versions || [];
  }

  getVersionName(id, versionId) {
    const version = this.getVersions(id).find((item) => item.id === versionId);
    return version ? version.name : null;
  }

  getLatestVersion(id) {
    const versions = this.getVersions(id);
    return versions.at(-1) || null;
  }

  addVersion(id, value) {
    if (!id) return null;
    const entity = this.getEntity(id);
    if (!entity) return null;
    if (!Array.isArray(entity.versions)) {
      entity.versions = [];
    }
    entity.versions.push(value);
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

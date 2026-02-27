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
      entitiesById[entity.id] = entity;
    });
    this.state.entitiesById = entitiesById;
    this.notify({ operation: "init", value: entities });
  }

  getList() {
    return Object.values(this.state.entitiesById);
  }

  add(entity) {
    this.state.entitiesById[entity.id] = entity;
    this.notify({ operation: "add", value: entity });
    return entity;
  }

  update(id, updates) {
    const entity = this.getEntity(id);
    Object.assign(entity, updates);
    this.notify({ operation: "update", value: entity });
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
  getEntityName(id) {
    return this.getEntity(id)?.name || null;
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
    const versions = this.getEntity(id)?.versions || [];
    return versions.at(-1) || null;
  }

  addVersion(id, value) {
    const entity = this.getEntity(id);
    entity.versions.push(value);
    entity.latestVersionId = value.id;
    this.notify({ operation: "versions.add", value });
    return value;
  }
}

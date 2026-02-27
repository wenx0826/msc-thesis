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
    this.notify({ key: "entitiesById", operation: "init", value: entities });
  }

  getList() {
    return Object.values(this.state.entitiesById);
  }

  add(entity) {
    this.state.entitiesById[entity.id] = entity;
    this.notify({ key: "entitiesById", operation: "add", value: entity });
    return entity;
  }

  update(id, updates) {
    const entity = this.getEntity(id);
    const oldValue = { ...entity };
    Object.assign(entity, updates);
    this.notify({
      key: "entitiesById",
      operation: "update",
      value: entity,
      oldValue,
    });
    return entity;
  }

  delete(id) {
    if (!id) return null;
    const value = this.state.entitiesById[id] || null;
    delete this.state.entitiesById[id];
    this.notify({ key: "entitiesById", operation: "delete", value });
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

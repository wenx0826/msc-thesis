import { Store } from "../../../shared/utils/store.js";

export class MetaByIdStore extends Store {
  constructor({ normalizeMeta = (value) => value, initialState = {} } = {}) {
    super({
      ...initialState,
      metaById: {},
    });
    this.normalizeMeta = normalizeMeta;
  }

  normalize(value) {
    const normalized = this.normalizeMeta(value);
    if (!normalized?.id) return null;
    return normalized;
  }

  init(value = []) {
    const nextMap = {};
    const values = Array.isArray(value) ? value : [];
    values.forEach((meta) => {
      const normalized = this.normalize(meta);
      if (!normalized) return;
      nextMap[normalized.id] = normalized;
    });
    this.state.metaById = nextMap;
    this.notify({ operation: "init", value: Object.values(nextMap) });
  }

  add(value) {
    const normalized = this.normalize(value);
    if (!normalized) return null;
    this.state.metaById[normalized.id] = normalized;
    this.notify({ operation: "add", value: normalized });
    return normalized;
  }

  delete(id) {
    if (!id) return null;
    const value = this.state.metaById[id] || null;
    delete this.state.metaById[id];
    this.notify({ operation: "delete", value });
    return value;
  }

  getCount() {
    return Object.keys(this.state.metaById).length;
  }

  getMeta(id) {
    return this.state.metaById[id] || null;
  }

  getList() {
    return Object.values(this.state.metaById);
  }

  getVersions(id) {
    return this.getMeta(id)?.versions || [];
  }

  getVersionName(id, versionId) {
    const version = this.getVersions(id).find((item) => item.id === versionId);
    return version ? version.name : null;
  }

  addVersion(id, value) {
    if (!id) return null;
    const meta = this.getMeta(id);
    if (!meta) return null;
    if (!Array.isArray(meta.versions)) {
      meta.versions = [];
    }
    meta.versions.push(value);
    this.notify({ operation: "versions.add", value });
    return value;
  }

  updateVersion(id, value) {
    if (!id) return null;
    const meta = this.getMeta(id);
    if (!meta || !Array.isArray(meta.versions)) return null;
    const versionIndex = meta.versions.findIndex((item) => item.id === value.id);
    if (versionIndex === -1) return null;
    meta.versions[versionIndex] = value;
    return value;
  }
}

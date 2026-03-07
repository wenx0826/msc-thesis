import { Store } from "../../../shared/utils/store.js";

export class EntitiesStore extends Store {
  constructor({ initialState = {} } = {}) {
    const initialBulkEditMode = initialState?.isBulkEditMode === true;
    super({
      ...initialState,
      entitiesById: {},
      selectedIds: [],
      isBulkEditMode: initialBulkEditMode,
    });
  }

  init(entities = []) {
    const entitiesById = {};
    for (const entity of entities) {
      entitiesById[entity.id] = entity;
    }

    const nextEntities = Object.values(entitiesById);
    this.state.entitiesById = entitiesById;
    this.notify({ key: "entitiesById", operation: "init", value: nextEntities });
    this.setSelectedIds([], { operation: "init" });
    this.setBulkEditMode(false);
  }

  getList() {
    return Object.values(this.state.entitiesById);
  }

  getEntityIds() {
    return Object.keys(this.state.entitiesById);
  }

  add(entity) {
    this.state.entitiesById[entity.id] = entity;
    this.notify({ key: "entitiesById", operation: "add", value: entity });
    return entity;
  }

  update(id, updates = {}) {
    const entity = this.getEntity(id);
    if (!entity) {
      return null;
    }

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
    const value = this.state.entitiesById[id] || null;
    if (!value) {
      return null;
    }

    delete this.state.entitiesById[id];
    this.notify({ key: "entitiesById", operation: "delete", value });

    if (this.isSelected(id)) {
      this.setSelectedIds(
        this.state.selectedIds.filter((selectedId) => selectedId !== id),
        { operation: "remove" },
      );
    }

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

  getSelectedIds() {
    return [...this.state.selectedIds];
  }

  getSelectedCount() {
    return this.state.selectedIds.length;
  }

  getIsBulkEditMode() {
    return this.state.isBulkEditMode === true;
  }

  setBulkEditMode(enabled) {
    const oldValue = this.getIsBulkEditMode();
    const newValue = enabled === true;
    if (oldValue === newValue) {
      return newValue;
    }

    if (!newValue) {
      this.clearSelection();
    }

    this.state.isBulkEditMode = newValue;
    this.notify({
      key: "isBulkEditMode",
      oldValue,
      newValue,
    });
    return newValue;
  }

  toggleBulkEditMode() {
    return this.setBulkEditMode(!this.getIsBulkEditMode());
  }

  isSelected(id) {
    return this.state.selectedIds.includes(id);
  }

  toValidSelectedIds(ids = []) {
    const seen = new Set();
    const result = [];

    for (const id of ids) {
      if (seen.has(id)) {
        continue;
      }
      if (!this.state.entitiesById[id]) {
        continue;
      }
      seen.add(id);
      result.push(id);
    }

    return result;
  }

  setSelectedIds(ids = [], { operation = "set" } = {}) {
    const oldValue = this.getSelectedIds();
    const nextValue = this.toValidSelectedIds(ids);
    const hasChanged =
      oldValue.length !== nextValue.length ||
      oldValue.some((id, index) => id !== nextValue[index]);

    if (!hasChanged && operation !== "init") {
      return nextValue;
    }

    this.state.selectedIds = nextValue;
    this.notify({
      key: "selectedIds",
      operation,
      value: [...nextValue],
      oldValue,
    });
    return [...nextValue];
  }

  setSelected(id, shouldSelect = true) {
    if (!this.state.entitiesById[id]) {
      return this.getSelectedIds();
    }

    if (shouldSelect) {
      if (this.isSelected(id)) {
        return this.getSelectedIds();
      }
      return this.setSelectedIds([...this.state.selectedIds, id], {
        operation: "add",
      });
    }

    if (!this.isSelected(id)) {
      return this.getSelectedIds();
    }

    return this.setSelectedIds(
      this.state.selectedIds.filter((selectedId) => selectedId !== id),
      { operation: "remove" },
    );
  }

  toggleSelected(id) {
    return this.setSelected(id, !this.isSelected(id));
  }

  clearSelection() {
    if (this.state.selectedIds.length === 0) {
      return [];
    }
    return this.setSelectedIds([], { operation: "clear" });
  }

  selectAll() {
    return this.selectAllVisible(this.getEntityIds());
  }

  selectAllVisible(ids = []) {
    return this.setSelectedIds(ids, { operation: "select_all" });
  }
}

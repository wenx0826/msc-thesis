import crypto from "crypto";
import { snake, toCamel } from "snake-camel";

function isSerializableObject(value) {
  return value !== null && typeof value === "object" && !(value instanceof Date);
}

export default class BaseSqlRepository {
  constructor({
    db,
    tableName,
    idColumn = "id",
    requiredCreateColumns = [],
    generatedColumns = {
      id: () => crypto.randomUUID(),
    },
    jsonColumns = [],
    nonInsertableColumns = ["created_at"],
    nonUpdatableColumns = ["id", "created_at"],
  }) {
    this.db = db;
    this.tableName = tableName;
    this.idColumn = idColumn;
    this.requiredCreateColumns = new Set(requiredCreateColumns);
    this.generatedColumns = generatedColumns;
    this.jsonColumns = new Set(jsonColumns);
    this.nonInsertableColumns = new Set(nonInsertableColumns);
    this.nonUpdatableColumns = new Set(nonUpdatableColumns);
    this.tableColumns = new Set(
      this.db
        .prepare(`PRAGMA table_info(${this.tableName})`)
        .all()
        .map((column) => column.name),
    );
  }

  deserializeRow(row) {
    return row;
  }

  mapRow(row) {
    if (!row) {
      return null;
    }
    return toCamel(this.deserializeRow(row));
  }

  normalizeEntries(data) {
    if (!data || typeof data !== "object") {
      return [];
    }

    return Object.entries(data)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [snake(key), value])
      .filter(([column]) => this.tableColumns.has(column));
  }

  applyGeneratedColumns(entries) {
    const entryMap = new Map(entries);

    // Strict rule: generated columns are always owned by the repository layer.
    for (const [column, generateValue] of Object.entries(this.generatedColumns)) {
      if (!this.tableColumns.has(column) || this.nonInsertableColumns.has(column)) {
        continue;
      }
      entryMap.set(column, generateValue());
    }

    return Array.from(entryMap.entries());
  }

  serializeValue(column, value) {
    if (this.jsonColumns.has(column) || isSerializableObject(value)) {
      return JSON.stringify(value);
    }
    return value;
  }

  create(data = {}) {
    let normalizedEntries = this.normalizeEntries(data).filter(
      ([column]) => !this.nonInsertableColumns.has(column),
    );
    normalizedEntries = this.applyGeneratedColumns(normalizedEntries);

    const providedColumns = new Set(
      normalizedEntries.map(([column]) => column),
    );
    const missingColumns = Array.from(this.requiredCreateColumns).filter(
      (column) => !providedColumns.has(column),
    );

    if (missingColumns.length > 0) {
      throw new Error(
        `Missing required fields for ${this.tableName} create: ${missingColumns.join(", ")}`,
      );
    }

    if (normalizedEntries.length === 0) {
      throw new Error(`No valid fields to insert into ${this.tableName}`);
    }

    const columns = normalizedEntries.map(([column]) => column).join(", ");
    const placeholders = normalizedEntries.map(() => "?").join(", ");
    const values = normalizedEntries.map(([column, value]) =>
      this.serializeValue(column, value),
    );

    const stmt = this.db.prepare(
      `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders}) RETURNING *`,
    );
    const row = stmt.get(...values);
    return this.mapRow(row);
  }

  findById(id) {
    const stmt = this.db.prepare(
      `SELECT * FROM ${this.tableName} WHERE ${this.idColumn} = ?`,
    );
    const row = stmt.get(id);
    return this.mapRow(row);
  }

  updateById(id, updates = {}) {
    const normalizedEntries = this.normalizeEntries(updates).filter(
      ([column]) => !this.nonUpdatableColumns.has(column),
    );

    if (normalizedEntries.length === 0) {
      return null;
    }

    const fields = normalizedEntries.map(([column]) => `${column} = ?`).join(", ");
    const values = normalizedEntries.map(([column, value]) =>
      this.serializeValue(column, value),
    );

    const stmt = this.db.prepare(
      `UPDATE ${this.tableName} SET ${fields} WHERE ${this.idColumn} = ?`,
    );
    const result = stmt.run(...values, id);

    if (result.changes === 0) {
      return null;
    }

    return this.findById(id);
  }
}

import db from "../../../database.js";
import { toCamel } from "snake-camel";
import BaseSqlRepository from "../../shared/repositories/BaseSqlRepository.js";

class ModelVersionRepository extends BaseSqlRepository {
  constructor() {
    super({
      db,
      tableName: "model_versions",
      requiredCreateColumns: ["model_id", "name"],
    });
  }

  findAll() {
    const stmt = db.prepare(
      "SELECT id, name, created_at, project_id FROM models",
    );
    const results = stmt.all();
    return results.map(toCamel);
  }

  findByModelId(modelId) {
    const stmt = db.prepare(
      "SELECT * FROM model_versions WHERE model_id = ? ORDER BY created_at ASC",
    );
    const results = stmt.all(modelId);
    return results.map(toCamel);
  }

  softDelete(modelId) {
    const stmt = db.prepare("UPDATE models SET deleted_at = ? WHERE id = ?");
    return stmt.run(new Date().toISOString(), modelId);
  }
}

export default new ModelVersionRepository();

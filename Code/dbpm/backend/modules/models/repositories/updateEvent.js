import db from "../../../database.js";
import BaseSqlRepository from "../../shared/repositories/BaseSqlRepository.js";

class ModelUpdateEventRepository extends BaseSqlRepository {
  constructor() {
    super({
      db,
      tableName: "model_update_events",
      requiredCreateColumns: ["model_version_id", "type"],
      jsonColumns: ["details"],
    });
  }

  add({ modelVersionId, type, details = null }) {
    return this.create({ modelVersionId, type, details });
  }
}

export default new ModelUpdateEventRepository();

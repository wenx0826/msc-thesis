import db from "../../../database.js";
import BaseSqlRepository from "../../shared/repositories/BaseSqlRepository.js";

class ModelVersionRepository extends BaseSqlRepository {
  constructor() {
    super({
      db,
      tableName: "model_versions",
      requiredCreateColumns: ["model_id", "version_number", "name"],
    });
  }

}

export default new ModelVersionRepository();

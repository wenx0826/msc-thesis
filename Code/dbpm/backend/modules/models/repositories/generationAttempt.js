import db from "../../../database.js";
import BaseSqlRepository from "../../shared/repositories/BaseSqlRepository.js";

class ModelGenerationAttemptRepository extends BaseSqlRepository {
  constructor() {
    super({
      db,
      tableName: "model_generation_attempts",
      requiredCreateColumns: [
        "project_id",
        "generation_type",
        "generation_input_mode",
        "result",
      ],
    });
  }

  /**
   * Record a generation attempt.
   *
   * @param {object} params
   * @param {string}  params.projectId
   * @param {string|null}  params.baseModelVersionId    - NULL for new generation
   * @param {string|null}  params.resultModelVersionId  - NULL for declined attempts
   * @param {'new'|'regeneration'|'refinement'} params.generationType
   * @param {'selection_only'|'selection_with_prompt'|'prompt'} params.generationInputMode
   * @param {'accepted_new_model'|'accepted_replace'|'accepted_new_version'|'declined'} params.result
   * @param {string|null}  params.prompt
   * @param {number|null}  params.selectedWordsCount
   * @param {number|null}  params.selectedTextSimilarity - Jaccard 0.0–1.0, regeneration with selections only
   */
  add({
    projectId,
    baseModelVersionId = null,
    resultModelVersionId = null,
    generationType,
    generationInputMode,
    result,
    prompt = null,
    selectedWordsCount = null,
    selectedTextSimilarity = null,
  }) {
    return this.create({
      projectId,
      baseModelVersionId,
      resultModelVersionId,
      generationType,
      generationInputMode,
      result,
      prompt,
      selectedWordsCount,
      selectedTextSimilarity,
    });
  }

  countByResultByProjectId(projectId) {
    const stmt = db.prepare(`
      SELECT result, COUNT(*) AS count
      FROM model_generation_attempts
      WHERE project_id = ?
      GROUP BY result
      ORDER BY count DESC, result ASC
    `);

    return stmt.all(projectId).map((row) => ({
      result: row.result,
      count: Number(row.count) || 0,
    }));
  }

  countByGenerationTypeByProjectId(projectId) {
    const stmt = db.prepare(`
      SELECT generation_type, COUNT(*) AS count
      FROM model_generation_attempts
      WHERE project_id = ?
      GROUP BY generation_type
      ORDER BY count DESC, generation_type ASC
    `);

    return stmt.all(projectId).map((row) => ({
      generationType: row.generation_type,
      count: Number(row.count) || 0,
    }));
  }

  countByGenerationInputModeByProjectId(projectId) {
    const stmt = db.prepare(`
      SELECT generation_input_mode, COUNT(*) AS count
      FROM model_generation_attempts
      WHERE project_id = ?
      GROUP BY generation_input_mode
      ORDER BY count DESC, generation_input_mode ASC
    `);

    return stmt.all(projectId).map((row) => ({
      generationInputMode: row.generation_input_mode,
      count: Number(row.count) || 0,
    }));
  }

  findByProjectId(projectId, limit = 100) {
    const stmt = db.prepare(`
      SELECT mga.*
      FROM model_generation_attempts mga
      WHERE mga.project_id = ?
      ORDER BY mga.created_at DESC, mga.id DESC
      LIMIT ?
    `);

    return stmt.all(projectId, limit).map((row) => this.mapRow(row));
  }
}

export default new ModelGenerationAttemptRepository();

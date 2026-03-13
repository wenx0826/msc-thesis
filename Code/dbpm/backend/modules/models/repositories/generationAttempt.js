import db from "../../../database.js";
import BaseSqlRepository from "../../shared/repositories/BaseSqlRepository.js";

class ModelGenerationAttemptRepository extends BaseSqlRepository {
  constructor() {
    super({
      db,
      tableName: "model_generation_attempts",
      requiredCreateColumns: ["project_id", "target", "mode", "outcome"],
    });
  }

  /**
   * Record a generation attempt.
   *
   * @param {object} params
   * @param {string}  params.projectId
   * @param {string|null}  params.targetModelVersionId  - NULL for initial generation
   * @param {string|null}  params.outcomeModelVersionId - NULL for declined attempts
   * @param {'initial'|'regeneration'} params.target
   * @param {'selection'|'selection_and_prompt'|'prompt'} params.mode
   * @param {'accepted'|'accepted_replace'|'accepted_new_version'|'declined'} params.outcome
   * @param {string|null}  params.prompt
   * @param {number|null}  params.selectedWordsCount
   * @param {number|null}  params.selectedTextSimilarity - Jaccard 0.0–1.0, regeneration+selection only
   */
  add({
    projectId,
    targetModelVersionId = null,
    outcomeModelVersionId = null,
    target,
    mode,
    outcome,
    prompt = null,
    selectedWordsCount = null,
    selectedTextSimilarity = null,
  }) {
    return this.create({
      projectId,
      targetModelVersionId,
      outcomeModelVersionId,
      target,
      mode,
      outcome,
      prompt,
      selectedWordsCount,
      selectedTextSimilarity,
    });
  }

  countByOutcomeByProjectId(projectId) {
    const stmt = db.prepare(`
      SELECT outcome, COUNT(*) AS count
      FROM model_generation_attempts
      WHERE project_id = ?
      GROUP BY outcome
      ORDER BY count DESC, outcome ASC
    `);

    return stmt.all(projectId).map((row) => ({
      outcome: row.outcome,
      count: Number(row.count) || 0,
    }));
  }

  countByTargetByProjectId(projectId) {
    const stmt = db.prepare(`
      SELECT target, COUNT(*) AS count
      FROM model_generation_attempts
      WHERE project_id = ?
      GROUP BY target
      ORDER BY count DESC, target ASC
    `);

    return stmt.all(projectId).map((row) => ({
      target: row.target,
      count: Number(row.count) || 0,
    }));
  }

  countByModeByProjectId(projectId) {
    const stmt = db.prepare(`
      SELECT mode, COUNT(*) AS count
      FROM model_generation_attempts
      WHERE project_id = ?
      GROUP BY mode
      ORDER BY count DESC, mode ASC
    `);

    return stmt.all(projectId).map((row) => ({
      mode: row.mode,
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

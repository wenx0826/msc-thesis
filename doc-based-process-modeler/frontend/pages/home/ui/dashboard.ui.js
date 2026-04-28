import { projectsAPI } from "../../../api/index.js";
import { createUI } from "../../../shared/utils/ui.js";
import { formatNumber } from "../../../shared/utils/number.js";

function setText(id, value) {
  const $el = $(`#${id}`);
  if ($el.length) $el.text(value);
}

createUI({
  setup: async () => {
    const overview = await projectsAPI.overview();
    const { projects, documents, models } = overview;

    setText("projectsCount", formatNumber(projects.count));
    setText("documentsCount", formatNumber(documents.count));
    setText("modelsCount", formatNumber(models.count));
    setText(
      "documentsAvgWordsCount",
      formatNumber(Number(documents.averageWordsCount).toFixed(0)),
    );
    setText(
      "documentsAvgVersionsCount",
      formatNumber(Number(documents.averageVersionsCount).toFixed(0)),
    );
    setText(
      "modelsAvgSelectedWordsCount",
      formatNumber(Number(models.averageSelectedWordsCount).toFixed(0)),
    );
    setText(
      "modelsAvgVersionsCount",
      formatNumber(Number(models.averageVersionsCount).toFixed(0)),
    );
  },
});

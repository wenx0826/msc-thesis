const VERSION_TAG_CONFIG = {
  latest: {
    className: "version-tag--latest",
    label: "Latest",
  },
  historical: {
    className: "version-tag--historical",
    label: "Historical",
  },
  draft: {
    className: "version-tag--draft",
    label: "Draft",
  },
};

const VERSION_TAG_VARIANT_CLASS_NAMES = Object.values(VERSION_TAG_CONFIG)
  .map((item) => item.className)
  .join(" ");

function isMissingValue(value) {
  return value === null || value === undefined || value === "";
}

function resolveVersionTagVariant(state) {
  if (state === null || state === undefined) {
    return null;
  }

  if (typeof state === "boolean") {
    return state ? "latest" : "historical";
  }

  if (typeof state === "string" && VERSION_TAG_CONFIG[state]) {
    return state;
  }

  if (typeof state !== "object") {
    return null;
  }

  const { id, versionId, sourceVersionId, isLatest } = state;
  const hasId = !isMissingValue(id);
  const hasVersionId = !isMissingValue(versionId);
  const hasSourceVersionId = !isMissingValue(sourceVersionId);

  if (!hasVersionId && (!hasId || hasSourceVersionId)) {
    return "draft";
  }

  if (hasId && hasVersionId && typeof isLatest === "boolean") {
    return isLatest ? "latest" : "historical";
  }

  return null;
}

export default function setVersionTag($tag, state) {
  if (!$tag?.length) {
    return;
  }

  const variant = resolveVersionTagVariant(state);

  if (!variant) {
    $tag
      .addClass("hidden")
      .removeClass(VERSION_TAG_VARIANT_CLASS_NAMES)
      .text("");
    return;
  }

  const { className, label } = VERSION_TAG_CONFIG[variant];
  $tag
    .removeClass(`hidden ${VERSION_TAG_VARIANT_CLASS_NAMES}`)
    .addClass(className)
    .text(label);
}

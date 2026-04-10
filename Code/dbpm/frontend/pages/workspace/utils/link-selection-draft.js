function normalizeSelectionTextPosition(textPosition) {
  if (textPosition === undefined || textPosition === null) {
    return null;
  }
  if (typeof textPosition === "string") {
    return textPosition;
  }
  try {
    return JSON.stringify(textPosition);
  } catch (error) {
    return String(textPosition);
  }
}

function buildSelectionsSignature(selections, mapper) {
  const normalizedSelections = Array.isArray(selections) ? selections : [];
  return JSON.stringify(normalizedSelections.map(mapper));
}

function getSelectionTextSignature(selection) {
  return JSON.stringify({
    textPosition: normalizeSelectionTextPosition(selection?.textPosition),
    textQuoteExact:
      typeof selection?.textQuote?.exact === "string"
        ? selection.textQuote.exact
        : "",
  });
}

function cloneSerializedSelection(selection) {
  if (!selection || typeof selection !== "object") {
    return selection;
  }
  return JSON.parse(JSON.stringify(selection));
}

export function classifyLinkSelectionChange({
  previousSelections,
  currentSelections,
}) {
  const previousTextSignature = buildSelectionsSignature(
    previousSelections,
    (selection) => ({
      id: selection?.id ?? null,
      textPosition: normalizeSelectionTextPosition(selection?.textPosition),
      textQuoteExact:
        typeof selection?.textQuote?.exact === "string"
          ? selection.textQuote.exact
          : "",
    }),
  );
  const currentTextSignature = buildSelectionsSignature(
    currentSelections,
    (selection) => ({
      id: selection?.id ?? null,
      textPosition: normalizeSelectionTextPosition(selection?.textPosition),
      textQuoteExact:
        typeof selection?.textQuote?.exact === "string"
          ? selection.textQuote.exact
          : "",
    }),
  );
  if (previousTextSignature !== currentTextSignature) {
    return "text_changed";
  }

  const previousColorSignature = buildSelectionsSignature(
    previousSelections,
    (selection) => ({
      id: selection?.id ?? null,
      backgroundColor:
        typeof selection?.style?.backgroundColor === "string"
          ? selection.style.backgroundColor
          : "",
      reviewStatus:
        typeof selection?.reviewStatus === "string"
          ? selection.reviewStatus
          : "none",
    }),
  );
  const currentColorSignature = buildSelectionsSignature(
    currentSelections,
    (selection) => ({
      id: selection?.id ?? null,
      backgroundColor:
        typeof selection?.style?.backgroundColor === "string"
          ? selection.style.backgroundColor
          : "",
      reviewStatus:
        typeof selection?.reviewStatus === "string"
          ? selection.reviewStatus
          : "none",
    }),
  );
  if (previousColorSignature !== currentColorSignature) {
    return "color_only";
  }

  return "no_change";
}

export function derivePendingTextChangedSelectionIds({
  previousSelections,
  currentSelections,
}) {
  const previousById = new Map();
  (Array.isArray(previousSelections) ? previousSelections : []).forEach(
    (selection) => {
      if (!selection?.id) return;
      previousById.set(selection.id, selection);
    },
  );

  return (Array.isArray(currentSelections) ? currentSelections : [])
    .map((selection) => {
      if (!selection?.id) return null;
      const previousSelection = previousById.get(selection.id);
      if (!previousSelection) return null;
      return getSelectionTextSignature(previousSelection) !==
        getSelectionTextSignature(selection)
        ? selection.id
        : null;
    })
    .filter(Boolean);
}

export function buildStyleSyncedSelections({
  previousSelections,
  currentSelections,
}) {
  const currentById = new Map();
  (Array.isArray(currentSelections) ? currentSelections : []).forEach(
    (selection) => {
      if (!selection?.id) return;
      currentById.set(selection.id, selection);
    },
  );

  return (Array.isArray(previousSelections) ? previousSelections : []).map(
    (selection) => {
      const clonedSelection = cloneSerializedSelection(selection);
      const currentSelection = currentById.get(selection?.id);
      if (!currentSelection) {
        return clonedSelection;
      }

      if (
        currentSelection?.style &&
        typeof currentSelection.style === "object"
      ) {
        clonedSelection.style = { ...currentSelection.style };
      } else {
        delete clonedSelection.style;
      }

      if (currentSelection?.reviewStatus !== undefined) {
        clonedSelection.reviewStatus = currentSelection.reviewStatus;
      } else {
        delete clonedSelection.reviewStatus;
      }

      return clonedSelection;
    },
  );
}

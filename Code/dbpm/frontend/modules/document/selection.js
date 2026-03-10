import * as textPos from "https://esm.sh/dom-anchor-text-position@5.0.0?bundle";
import * as textQuote from "https://esm.sh/dom-anchor-text-quote@3.0.0?bundle";

// Selection utilities for document text ranges
function getRoot() {
  return document.getElementById("documentContent");
}

function createRangeFromSelector(selector) {
  const root = getRoot();

  try {
    return textPos.toRange(root, selector);
  } catch {
    return null;
  }
}

export function serializeRange(range) {
  const root = getRoot();
  const textPosition = textPos.fromRange(root, range);
  const textQuoteSelector = textQuote.fromTextPosition(root, textPosition);
  return {
    textPosition,
    textQuote: textQuoteSelector,
  };
}

export function deserializeRange(textPosition) {
  return createRangeFromSelector(textPosition);
}

export function getSortedSelectionsByRange(items) {
  return items.sort((a, b) =>
    a.range.compareBoundaryPoints(Range.START_TO_START, b.range),
  );
}

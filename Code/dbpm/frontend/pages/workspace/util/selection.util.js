// Selection utilities for document text ranges
export function getXPath(
  node,
  root = document.getElementById("documentContent"),
) {
  if (node === root) return "/";
  const path = [];
  let cur = node;
  while (cur && cur !== root) {
    const idx = Array.prototype.indexOf.call(cur.parentNode.childNodes, cur);
    path.unshift(idx);
    cur = cur.parentNode;
  }
  return "/" + path.join("/");
}

export function getNodeByXPath(
  path,
  root = document.getElementById("documentContent"),
) {
  const parts = path.split("/").filter(Boolean);
  let node = root;
  for (const idx of parts) {
    const i = parseInt(idx, 10);
    if (!node || !node.childNodes[i]) return null;
    node = node.childNodes[i];
  }
  return node;
}

export function serializeRange(range) {
  return {
    startXPath: getXPath(range.startContainer),
    startOffset: range.startOffset,
    endXPath: getXPath(range.endContainer),
    endOffset: range.endOffset,
  };
}

export function deserializeRange({
  startXPath,
  startOffset,
  endXPath,
  endOffset,
}) {
  const startNode = getNodeByXPath(startXPath);
  const endNode = getNodeByXPath(endXPath);
  const range = document.createRange();
  if (startNode && endNode) {
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
  }
  return range;
}

export function getSortedSelectionsByRange(items) {
  return items.sort((a, b) => {
    const rangeA = a.range;
    const rangeB = b.range;
    return rangeA.compareBoundaryPoints(Range.START_TO_START, rangeB);
  });
}

// Expose to window for legacy code
window.getXPath = getXPath;
window.getNodeByXPath = getNodeByXPath;
window.serializeRange = serializeRange;
window.deserializeRange = deserializeRange;
window.getSortedSelectionsByRange = getSortedSelectionsByRange;

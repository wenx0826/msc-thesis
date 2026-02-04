function getXPath(node, root = document.getElementById("documentContent")) {
  // console.log("getXPath called with  root:", root);
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

function getNodeByXPath(
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

function serializeRange(range) {
  return {
    // color: h.color,
    startXPath: getXPath(range.startContainer),
    startOffset: range.startOffset,
    endXPath: getXPath(range.endContainer),
    endOffset: range.endOffset,
  };
}

function deserializeRange({ startXPath, startOffset, endXPath, endOffset }) {
  const startNode = getNodeByXPath(startXPath);
  const endNode = getNodeByXPath(endXPath);
  const range = document.createRange();
  if (startNode && endNode) {
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
  }
  return range;
}

// function compareXPath(a, b) {
//   const pa = a.split("/").filter(Boolean).map(Number);
//   const pb = b.split("/").filter(Boolean).map(Number);

//   const len = Math.min(pa.length, pb.length);

//   for (let i = 0; i < len; i++) {
//     if (pa[i] !== pb[i]) {
//       return pa[i] - pb[i];
//     }
//   }
//   return pa.length - pb.length;
// }

// function compareSerializedRange(r1, r2) {
//   const pathDiff = compareXPath(r1.startXPath, r2.startXPath);
//   if (pathDiff !== 0) return pathDiff;
//   return r1.startOffset - r2.startOffset;
// }

function getSortedSelectionsByRange(items) {
  console.log("Sorting selections by range:!!!!!", items);
  return items.sort((a, b) => {
    const rangeA = a.range;
    const rangeB = b.range;
    return rangeA.compareBoundaryPoints(Range.START_TO_START, rangeB);
  });
}

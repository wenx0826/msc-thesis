// Selection utilities for document text ranges
function getRoot() {
  return document.getElementById("documentContent");
}

function normalizeWhitespace(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.replace(/\s+/g, " ").trim();
}

function clampOffset(node, offset) {
  const safeOffset = Number.isFinite(offset) ? offset : 0;
  if (!node) {
    return 0;
  }

  if (node.nodeType === Node.TEXT_NODE) {
    const length = node.textContent?.length ?? 0;
    return Math.max(0, Math.min(length, safeOffset));
  }

  const length = node.childNodes?.length ?? 0;
  return Math.max(0, Math.min(length, safeOffset));
}

function createRangeFromXPath({
  startXPath,
  startOffset,
  endXPath,
  endOffset,
} = {}) {
  const startNode = getNodeByXPath(startXPath);
  const endNode = getNodeByXPath(endXPath);
  if (!startNode || !endNode) {
    return null;
  }

  try {
    const range = document.createRange();
    range.setStart(startNode, clampOffset(startNode, startOffset));
    range.setEnd(endNode, clampOffset(endNode, endOffset));
    return range;
  } catch (error) {
    return null;
  }
}

function collectTextNodes(root) {
  if (!root) {
    return { textNodes: [], textContent: "" };
  }

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        return node.nodeValue?.length
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      },
    },
  );

  const textNodes = [];
  let textContent = "";
  let cursor = 0;
  let currentNode = walker.nextNode();

  while (currentNode) {
    const value = currentNode.nodeValue ?? "";
    const nextCursor = cursor + value.length;
    textNodes.push({
      node: currentNode,
      start: cursor,
      end: nextCursor,
    });
    textContent += value;
    cursor = nextCursor;
    currentNode = walker.nextNode();
  }

  return { textNodes, textContent };
}

function buildNormalizedIndex(text) {
  let normalized = "";
  const normalizedToRaw = [];
  let previousWasWhitespace = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const isWhitespace = /\s/.test(char);
    if (isWhitespace) {
      if (normalized.length === 0 || previousWasWhitespace) {
        continue;
      }
      normalized += " ";
      normalizedToRaw.push(index);
      previousWasWhitespace = true;
      continue;
    }

    normalized += char;
    normalizedToRaw.push(index);
    previousWasWhitespace = false;
  }

  if (normalized.endsWith(" ")) {
    normalized = normalized.slice(0, -1);
    normalizedToRaw.pop();
  }

  return { normalized, normalizedToRaw };
}

function findAllIndices(haystack, needle) {
  if (!haystack || !needle) {
    return [];
  }

  const indices = [];
  let cursor = 0;
  while (cursor <= haystack.length - needle.length) {
    const index = haystack.indexOf(needle, cursor);
    if (index === -1) {
      break;
    }
    indices.push(index);
    cursor = index + 1;
  }

  return indices;
}

function resolvePointFromIndex(textNodes, index) {
  if (!textNodes.length) {
    return null;
  }

  const totalLength = textNodes[textNodes.length - 1].end;
  const target = Math.max(0, Math.min(totalLength, index));

  for (const segment of textNodes) {
    if (target <= segment.end) {
      return {
        node: segment.node,
        offset: clampOffset(segment.node, target - segment.start),
      };
    }
  }

  const last = textNodes[textNodes.length - 1];
  return {
    node: last.node,
    offset: clampOffset(last.node, last.end - last.start),
  };
}

function findPreferredIndex(range) {
  const root = getRoot();
  if (!root || !range) {
    return null;
  }

  try {
    const probe = document.createRange();
    probe.selectNodeContents(root);
    probe.setEnd(range.startContainer, range.startOffset);
    return probe.toString().length;
  } catch (error) {
    return null;
  }
}

function resolveTextMatches(textContent, targetText) {
  if (!textContent || !targetText) {
    return [];
  }

  const matches = [];

  const exact = findAllIndices(textContent, targetText).map((start) => ({
    start,
    end: start + targetText.length,
  }));
  matches.push(...exact);

  if (!matches.length) {
    const lowerTextContent = textContent.toLowerCase();
    const lowerTargetText = targetText.toLowerCase();
    const caseInsensitive = findAllIndices(lowerTextContent, lowerTargetText).map(
      (start) => ({
        start,
        end: start + targetText.length,
      }),
    );
    matches.push(...caseInsensitive);
  }

  if (!matches.length) {
    const normalizedTargetText = normalizeWhitespace(targetText);
    if (normalizedTargetText) {
      const { normalized, normalizedToRaw } = buildNormalizedIndex(textContent);
      const normalizedMatches = findAllIndices(
        normalized,
        normalizedTargetText,
      ).map((start) => {
        const endIndex = start + normalizedTargetText.length - 1;
        return {
          start: normalizedToRaw[start],
          end: normalizedToRaw[endIndex] + 1,
        };
      });
      matches.push(...normalizedMatches);
    }
  }

  const unique = [];
  const seen = new Set();
  for (const match of matches) {
    if (
      !Number.isInteger(match.start) ||
      !Number.isInteger(match.end) ||
      match.end <= match.start
    ) {
      continue;
    }
    const key = `${match.start}:${match.end}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(match);
    }
  }

  return unique;
}

function createRangeFromText(targetText, preferredIndex = null) {
  const root = getRoot();
  if (!root) {
    return null;
  }

  const { textNodes, textContent } = collectTextNodes(root);
  if (!textNodes.length || !textContent) {
    return null;
  }

  const matches = resolveTextMatches(textContent, targetText);
  if (!matches.length) {
    return null;
  }

  let selectedMatch = matches[0];
  if (Number.isFinite(preferredIndex)) {
    selectedMatch = matches.reduce((best, current) => {
      const bestDistance = Math.abs(best.start - preferredIndex);
      const currentDistance = Math.abs(current.start - preferredIndex);
      return currentDistance < bestDistance ? current : best;
    }, selectedMatch);
  }

  const startPoint = resolvePointFromIndex(textNodes, selectedMatch.start);
  const endPoint = resolvePointFromIndex(textNodes, selectedMatch.end);
  if (!startPoint || !endPoint) {
    return null;
  }

  try {
    const range = document.createRange();
    range.setStart(startPoint.node, startPoint.offset);
    range.setEnd(endPoint.node, endPoint.offset);
    return range;
  } catch (error) {
    return null;
  }
}

export function getXPath(
  node,
  // root = document.getElementById("documentContent"),
) {
  const root = getRoot();
  if (!root || !node) return "/";
  if (node === root) return "/";
  const path = [];
  let cur = node;
  while (cur && cur !== root) {
    if (!cur.parentNode) return "/";
    const idx = Array.prototype.indexOf.call(cur.parentNode.childNodes, cur);
    path.unshift(idx);
    cur = cur.parentNode;
  }
  return "/" + path.join("/");
}

export function getNodeByXPath(
  path,
  // root = document.getElementById("documentContent"),
) {
  const root = getRoot();
  if (!root || typeof path !== "string") return null;
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

export function deserializeRange(serializedRange, { text } = {}) {
  const rangeFromXPath = createRangeFromXPath(serializedRange);
  const expectedText = normalizeWhitespace(text);

  if (rangeFromXPath) {
    if (!expectedText) {
      return rangeFromXPath;
    }

    const currentText = normalizeWhitespace(rangeFromXPath.toString());
    if (currentText === expectedText) {
      return rangeFromXPath;
    }
  }

  if (expectedText) {
    const preferredIndex = findPreferredIndex(rangeFromXPath);
    const rangeFromText = createRangeFromText(expectedText, preferredIndex);
    if (rangeFromText) {
      return rangeFromText;
    }
  }

  return rangeFromXPath;
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

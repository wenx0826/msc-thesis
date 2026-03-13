import * as textPos from "https://esm.sh/dom-anchor-text-position@5.0.0?bundle";
import * as textQuote from "https://esm.sh/dom-anchor-text-quote@3.0.0?bundle";

// Selection utilities for document text ranges
const RECT_EPSILON = 0.5;

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

function isRenderableRect(rect) {
  return (
    rect &&
    Number.isFinite(rect.top) &&
    Number.isFinite(rect.left) &&
    Number.isFinite(rect.width) &&
    Number.isFinite(rect.height) &&
    rect.width > 0 &&
    rect.height > 0
  );
}

function getRectArea(rect) {
  return Math.max(0, rect.width) * Math.max(0, rect.height);
}

function toPlainRect(rect) {
  const top = Number(rect.top);
  const left = Number(rect.left);
  const width = Number(rect.width);
  const height = Number(rect.height);
  return {
    top,
    left,
    width,
    height,
    right: left + width,
    bottom: top + height,
  };
}

function isRectContainedIn(innerRect, outerRect) {
  return (
    innerRect.left >= outerRect.left - RECT_EPSILON &&
    innerRect.top >= outerRect.top - RECT_EPSILON &&
    innerRect.right <= outerRect.right + RECT_EPSILON &&
    innerRect.bottom <= outerRect.bottom + RECT_EPSILON
  );
}

function compareRectsByPosition(rectA, rectB) {
  if (Math.abs(rectA.top - rectB.top) > RECT_EPSILON) {
    return rectA.top - rectB.top;
  }
  if (Math.abs(rectA.left - rectB.left) > RECT_EPSILON) {
    return rectA.left - rectB.left;
  }
  if (Math.abs(rectA.height - rectB.height) > RECT_EPSILON) {
    return rectA.height - rectB.height;
  }
  return rectA.width - rectB.width;
}

function areRectsNearlyEqual(rectA, rectB) {
  return (
    Math.abs(rectA.top - rectB.top) <= RECT_EPSILON &&
    Math.abs(rectA.left - rectB.left) <= RECT_EPSILON &&
    Math.abs(rectA.width - rectB.width) <= RECT_EPSILON &&
    Math.abs(rectA.height - rectB.height) <= RECT_EPSILON
  );
}

function dedupeRects(rects) {
  const uniqueRects = [];
  for (const rect of rects) {
    const hasMatch = uniqueRects.some((item) => areRectsNearlyEqual(item, rect));
    if (!hasMatch) {
      uniqueRects.push(rect);
    }
  }
  return uniqueRects;
}

function dropContainerRects(rects) {
  if (rects.length < 3) {
    return rects;
  }

  return rects.filter((candidateRect, candidateIndex) => {
    const candidateArea = getRectArea(candidateRect);
    if (candidateArea <= 0) {
      return false;
    }

    const coveredRects = rects.filter((otherRect, otherIndex) => {
      if (otherIndex === candidateIndex) {
        return false;
      }
      if (!isRectContainedIn(otherRect, candidateRect)) {
        return false;
      }

      const otherArea = getRectArea(otherRect);
      if (otherArea <= 0 || otherArea >= candidateArea * 0.98) {
        return false;
      }

      const significantlyShorter =
        otherRect.height < candidateRect.height - RECT_EPSILON;
      const significantlyNarrower =
        otherRect.width < candidateRect.width - RECT_EPSILON;
      return significantlyShorter || significantlyNarrower;
    });

    const shouldDrop =
      coveredRects.length >= 2 &&
      coveredRects.some(
        (rect) =>
          rect.height < candidateRect.height * 0.8 ||
          rect.width < candidateRect.width * 0.8,
      );
    return !shouldDrop;
  });
}

function getNodeLineHeight(node) {
  const referenceElement =
    node?.parentElement || document.getElementById("documentContent");
  if (!referenceElement) {
    return 0;
  }

  const computedStyle = window.getComputedStyle(referenceElement);
  const parsedLineHeight = Number.parseFloat(computedStyle.lineHeight);
  if (Number.isFinite(parsedLineHeight) && parsedLineHeight > 0) {
    return parsedLineHeight;
  }

  const fontSize = Number.parseFloat(computedStyle.fontSize);
  if (Number.isFinite(fontSize) && fontSize > 0) {
    return fontSize * 1.2;
  }

  return 0;
}

function collectTextNodesInRange(range) {
  if (!range) {
    return [];
  }

  const textNodes = [];
  const commonAncestor = range.commonAncestorContainer;

  if (commonAncestor?.nodeType === Node.TEXT_NODE) {
    return [commonAncestor];
  }

  if (!commonAncestor) {
    return [];
  }

  const walker = document.createTreeWalker(
    commonAncestor,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (!node?.textContent?.trim()) {
          return NodeFilter.FILTER_REJECT;
        }
        try {
          return range.intersectsNode(node)
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT;
        } catch {
          return NodeFilter.FILTER_REJECT;
        }
      },
    },
  );

  let currentNode = walker.nextNode();
  while (currentNode) {
    textNodes.push(currentNode);
    currentNode = walker.nextNode();
  }

  return textNodes;
}

function getTextNodeSegmentRange(node, range) {
  const nodeRange = document.createRange();
  nodeRange.selectNodeContents(node);

  const rangeStartsAfterNodeEnd =
    range.compareBoundaryPoints(Range.START_TO_END, nodeRange) >= 0;
  const rangeEndsBeforeNodeStart =
    range.compareBoundaryPoints(Range.END_TO_START, nodeRange) <= 0;
  if (rangeStartsAfterNodeEnd || rangeEndsBeforeNodeStart) {
    return null;
  }

  const segmentRange = document.createRange();
  if (range.compareBoundaryPoints(Range.START_TO_START, nodeRange) <= 0) {
    segmentRange.setStart(node, 0);
  } else {
    segmentRange.setStart(range.startContainer, range.startOffset);
  }

  if (range.compareBoundaryPoints(Range.END_TO_END, nodeRange) >= 0) {
    segmentRange.setEnd(node, node.textContent?.length || 0);
  } else {
    segmentRange.setEnd(range.endContainer, range.endOffset);
  }

  return segmentRange.collapsed ? null : segmentRange;
}

function getWordTokenLineRects(node, segmentRange) {
  if (!node || !segmentRange || segmentRange.collapsed) {
    return [];
  }

  const textContent = node.textContent || "";
  const startOffset =
    segmentRange.startContainer === node ? segmentRange.startOffset : 0;
  const endOffset =
    segmentRange.endContainer === node ? segmentRange.endOffset : textContent.length;

  if (endOffset <= startOffset) {
    return [];
  }

  const segmentText = textContent.slice(startOffset, endOffset);
  const tokenPattern = /\S+/g;
  const tokenRects = [];
  let match = tokenPattern.exec(segmentText);

  while (match) {
    const tokenText = match[0];
    const tokenStartOffset = startOffset + match.index;
    const tokenEndOffset = tokenStartOffset + tokenText.length;

    const tokenRange = document.createRange();
    tokenRange.setStart(node, tokenStartOffset);
    tokenRange.setEnd(node, tokenEndOffset);

    Array.from(tokenRange.getClientRects() || []).forEach((rect) => {
      if (isRenderableRect(rect)) {
        tokenRects.push(toPlainRect(rect));
      }
    });

    match = tokenPattern.exec(segmentText);
  }

  if (tokenRects.length === 0) {
    return [];
  }

  const sortedTokenRects = dedupeRects(tokenRects).sort(compareRectsByPosition);
  const lineHeight = getNodeLineHeight(node);
  const lineTolerance = Math.max(1.5, lineHeight * 0.35);
  const lineRects = [];

  sortedTokenRects.forEach((rect) => {
    const lastLineRect = lineRects[lineRects.length - 1];
    if (!lastLineRect) {
      lineRects.push({ ...rect });
      return;
    }

    const sameLine = Math.abs(lastLineRect.top - rect.top) <= lineTolerance;
    if (!sameLine) {
      lineRects.push({ ...rect });
      return;
    }

    lastLineRect.top = Math.min(lastLineRect.top, rect.top);
    lastLineRect.left = Math.min(lastLineRect.left, rect.left);
    lastLineRect.right = Math.max(lastLineRect.right, rect.right);
    lastLineRect.bottom = Math.max(lastLineRect.bottom, rect.bottom);
    lastLineRect.width = Math.max(0, lastLineRect.right - lastLineRect.left);
    lastLineRect.height = Math.max(0, lastLineRect.bottom - lastLineRect.top);
  });

  return lineRects;
}

function getTextSelectionRects(range) {
  const textNodes = collectTextNodesInRange(range);
  if (textNodes.length === 0) {
    return [];
  }

  const rects = [];
  for (const node of textNodes) {
    const segmentRange = getTextNodeSegmentRange(node, range);
    if (!segmentRange) {
      continue;
    }

    let segmentRects = Array.from(segmentRange.getClientRects() || [])
      .filter(isRenderableRect)
      .map((rect) => toPlainRect(rect));

    if (segmentRects.length === 1) {
      const lineHeight = getNodeLineHeight(node);
      const suspiciouslyTall =
        lineHeight > 0 && segmentRects[0].height > lineHeight * 1.5;
      if (suspiciouslyTall) {
        const tokenLineRects = getWordTokenLineRects(node, segmentRange);
        if (tokenLineRects.length > 1) {
          segmentRects = tokenLineRects;
        }
      }
    }

    for (const rect of segmentRects) {
      if (isRenderableRect(rect)) {
        rects.push(rect);
      }
    }
  }

  return dropContainerRects(dedupeRects(rects)).sort(compareRectsByPosition);
}

export function getRenderableRangeClientRects(range) {
  if (!range || range.collapsed) {
    return [];
  }

  const textRects = getTextSelectionRects(range);
  if (textRects.length > 0) {
    return textRects;
  }

  const rects = Array.from(range.getClientRects() || [])
    .filter(isRenderableRect)
    .map((rect) => toPlainRect(rect));
  return dropContainerRects(dedupeRects(rects)).sort(compareRectsByPosition);
}

export function getRectsBoundingBox(rects) {
  if (!Array.isArray(rects) || rects.length === 0) {
    return null;
  }

  let top = Number.POSITIVE_INFINITY;
  let left = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;

  rects.forEach((rect) => {
    top = Math.min(top, rect.top);
    left = Math.min(left, rect.left);
    right = Math.max(right, rect.right ?? rect.left + rect.width);
    bottom = Math.max(bottom, rect.bottom ?? rect.top + rect.height);
  });

  if (!Number.isFinite(top) || !Number.isFinite(left)) {
    return null;
  }

  return {
    top,
    left,
    right,
    bottom,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

export function getSortedSelectionsByRange(items) {
  return items.sort((a, b) =>
    a.range.compareBoundaryPoints(Range.START_TO_START, b.range),
  );
}

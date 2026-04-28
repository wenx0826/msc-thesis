const HTML_ESCAPE_LOOKUP = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const PDF_LIST_ITEM_PATTERN =
  /^((?:\d+|[a-zA-Z])[.)]|[-*+]|[\u2022\u25AA\u25E6])\s+/;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    return HTML_ESCAPE_LOOKUP[character];
  });
}

function getMedian(values) {
  const sortedValues = values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right);

  if (sortedValues.length === 0) {
    return 0;
  }

  const middleIndex = Math.floor(sortedValues.length / 2);
  if (sortedValues.length % 2 === 0) {
    return (
      (sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2
    );
  }
  return sortedValues[middleIndex];
}

function getItemFontSize(item) {
  const transform = Array.isArray(item?.transform) ? item.transform : [];
  const verticalScale = Math.abs(Number(transform[3])) || 0;
  const horizontalScale = Math.abs(Number(transform[0])) || 0;
  return (
    Number(item?.height) ||
    verticalScale ||
    horizontalScale ||
    0
  );
}

function normalizePdfTextItems(textContent) {
  return (textContent?.items ?? [])
    .map((item) => {
      const text = String(item?.str ?? "")
        .replace(/\s+/g, " ")
        .trim();

      if (!text) {
        return null;
      }

      const transform = Array.isArray(item?.transform) ? item.transform : [];
      const x = Number(transform[4]) || 0;
      const y = Number(transform[5]) || 0;
      const width = Number(item?.width) || 0;
      const fontSize = getItemFontSize(item);

      return {
        text,
        x,
        y,
        width,
        height: Number(item?.height) || fontSize,
        right: x + width,
        fontSize,
        fontName: typeof item?.fontName === "string" ? item.fontName : "",
      };
    })
    .filter(Boolean);
}

function getApproximateCharacterWidth(item) {
  if (item?.width > 0 && item?.text?.length > 0) {
    return item.width / item.text.length;
  }
  if (item?.fontSize > 0) {
    return item.fontSize * 0.45;
  }
  return 4;
}

function shouldInsertSpaceBetweenItems(previousText, currentText, gap, refWidth) {
  if (gap <= Math.max(0.75, refWidth * 0.18)) {
    return false;
  }

  if (/^[,.;:!?%)\]}]/.test(currentText)) {
    return false;
  }

  if (/[([{"/']$/.test(previousText)) {
    return false;
  }

  return true;
}

function combineLineItems(items) {
  const sortedItems = [...items].sort((left, right) => left.x - right.x);
  let lineText = "";
  let previousItem = null;

  for (const item of sortedItems) {
    if (!lineText) {
      lineText = item.text;
      previousItem = item;
      continue;
    }

    const gap = item.x - previousItem.right;
    const referenceWidth = Math.max(
      getApproximateCharacterWidth(previousItem),
      getApproximateCharacterWidth(item),
    );

    if (
      shouldInsertSpaceBetweenItems(
        lineText,
        item.text,
        gap,
        referenceWidth,
      )
    ) {
      lineText += " ";
    }

    lineText += item.text;
    previousItem = item;
  }

  const fontSizes = sortedItems
    .map((item) => item.fontSize)
    .filter((fontSize) => fontSize > 0);

  return {
    text: lineText.replace(/\s+/g, " ").trim(),
    y: getMedian(sortedItems.map((item) => item.y)),
    left: Math.min(...sortedItems.map((item) => item.x)),
    right: Math.max(...sortedItems.map((item) => item.right)),
    fontSize: getMedian(fontSizes),
    isBold: sortedItems.some((item) =>
      /bold|black|heavy|demi/i.test(item.fontName),
    ),
  };
}

function groupPdfItemsIntoLines(items) {
  if (items.length === 0) {
    return [];
  }

  const fontSizes = items
    .map((item) => item.fontSize)
    .filter((fontSize) => fontSize > 0);
  const medianFontSize = getMedian(fontSizes) || 12;
  const yTolerance = Math.max(2, medianFontSize * 0.35);

  const sortedItems = [...items].sort((left, right) => {
    if (Math.abs(left.y - right.y) > yTolerance) {
      return right.y - left.y;
    }
    return left.x - right.x;
  });

  const rawLines = [];
  for (const item of sortedItems) {
    const currentLine = rawLines[rawLines.length - 1];
    if (!currentLine || Math.abs(currentLine.anchorY - item.y) > yTolerance) {
      rawLines.push({
        anchorY: item.y,
        items: [item],
      });
      continue;
    }

    currentLine.items.push(item);
    currentLine.anchorY = getMedian(
      currentLine.items.map((lineItem) => lineItem.y),
    );
  }

  return rawLines
    .map((line) => combineLineItems(line.items))
    .filter((line) => line.text);
}

function getLetterStats(text) {
  const letters = (text.match(/[A-Za-z]/g) ?? []).length;
  const uppercaseLetters = (text.match(/[A-Z]/g) ?? []).length;
  return { letters, uppercaseLetters };
}

function getHeadingTag(fontSize, bodyFontSize) {
  if (fontSize >= bodyFontSize * 1.9) {
    return "h1";
  }
  if (fontSize >= bodyFontSize * 1.5) {
    return "h2";
  }
  return "h3";
}

function classifyPdfLine(line, bodyFontSize) {
  const text = line.text.trim();
  if (!text) {
    return "p";
  }

  if (PDF_LIST_ITEM_PATTERN.test(text)) {
    return "li";
  }

  const { letters, uppercaseLetters } = getLetterStats(text);
  const uppercaseRatio = letters > 0 ? uppercaseLetters / letters : 0;
  const looksLikeHeading =
    text.length <= 120 &&
    !/[.!?]$/.test(text) &&
    (
      line.fontSize >= bodyFontSize * 1.35 ||
      (
        line.fontSize >= bodyFontSize * 1.18 &&
        (line.isBold || uppercaseRatio >= 0.7)
      )
    );

  if (looksLikeHeading) {
    return getHeadingTag(line.fontSize, bodyFontSize);
  }

  return "p";
}

function shouldStartNewParagraph(previousLine, currentLine, bodyFontSize, lineGap) {
  if (!previousLine) {
    return true;
  }

  if (previousLine.tag !== "p" || currentLine.tag !== "p") {
    return true;
  }

  const verticalGap = previousLine.y - currentLine.y;
  const indentationShift = Math.abs(currentLine.left - previousLine.left);
  const fontDelta = Math.abs(currentLine.fontSize - previousLine.fontSize);

  if (verticalGap > lineGap * 1.45) {
    return true;
  }

  if (indentationShift > bodyFontSize * 1.4) {
    return true;
  }

  if (fontDelta > bodyFontSize * 0.18) {
    return true;
  }

  return false;
}

function joinParagraphText(existingText, nextLineText) {
  if (!existingText) {
    return nextLineText;
  }

  if (/[-\u2010-\u2015]$/.test(existingText) && /^[a-z]/.test(nextLineText)) {
    return existingText.replace(/[-\u2010-\u2015]\s*$/, "") + nextLineText;
  }

  if (/^[,.;:!?%)\]}]/.test(nextLineText)) {
    return existingText + nextLineText;
  }

  return `${existingText} ${nextLineText}`;
}

function buildPdfBlocks(lines) {
  if (lines.length === 0) {
    return [];
  }

  const bodyFontSize =
    getMedian(lines.map((line) => line.fontSize).filter(Boolean)) || 12;
  const lineGaps = [];
  for (let index = 1; index < lines.length; index += 1) {
    const gap = lines[index - 1].y - lines[index].y;
    if (gap > 0) {
      lineGaps.push(gap);
    }
  }
  const typicalLineGap = getMedian(lineGaps) || bodyFontSize * 1.2;

  const typedLines = lines.map((line) => ({
    ...line,
    tag: classifyPdfLine(line, bodyFontSize),
  }));

  const blocks = [];
  for (const line of typedLines) {
    const previousBlock = blocks[blocks.length - 1];
    const previousLine = previousBlock?.lastLine ?? null;

    if (
      !previousBlock ||
      shouldStartNewParagraph(
        previousLine,
        line,
        bodyFontSize,
        typicalLineGap,
      )
    ) {
      blocks.push({
        tag: line.tag,
        text: line.text,
        lastLine: line,
      });
      continue;
    }

    previousBlock.text = joinParagraphText(previousBlock.text, line.text);
    previousBlock.lastLine = line;
  }

  return blocks;
}

function renderPdfBlocks(pageNumber, blocks) {
  if (blocks.length === 0) {
    return "";
  }

  let html = `<section class="pdf-page" data-page-number="${pageNumber}">`;
  let isListOpen = false;

  for (const block of blocks) {
    if (block.tag === "li") {
      if (!isListOpen) {
        html += "<ul>";
        isListOpen = true;
      }
      html += `<li>${escapeHtml(block.text)}</li>`;
      continue;
    }

    if (isListOpen) {
      html += "</ul>";
      isListOpen = false;
    }

    html += `<${block.tag}>${escapeHtml(block.text)}</${block.tag}>`;
  }

  if (isListOpen) {
    html += "</ul>";
  }

  html += "</section>";
  return html;
}

function renderPdfTextFallback(pageNumber, items) {
  if (items.length === 0) {
    return "";
  }

  const text = items.map((item) => item.text).join(" ").replace(/\s+/g, " ").trim();
  if (!text) {
    return "";
  }

  return `<section class="pdf-page" data-page-number="${pageNumber}"><p>${escapeHtml(text)}</p></section>`;
}

async function extractPdfContentAsHtml(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageHtml = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const normalizedItems = normalizePdfTextItems(textContent);
    const lines = groupPdfItemsIntoLines(normalizedItems);
    const blocks = buildPdfBlocks(lines);
    const renderedPage =
      renderPdfBlocks(pageNumber, blocks) ||
      renderPdfTextFallback(pageNumber, normalizedItems);

    if (renderedPage) {
      pageHtml.push(renderedPage);
    }
  }

  return pageHtml.join("");
}

export async function getFileContentInHTML(file) {
  let fileContent = "";
  if (file.type === "application/pdf") {
    fileContent = await extractPdfContentAsHtml(file);
  } else if (
    file.type === "application/msword" ||
    file.name.endsWith(".doc") ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.name.endsWith(".docx")
  ) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    fileContent = new DOMParser().parseFromString(result.value, "text/html")
      .body.innerHTML;
  } else {
    fileContent = await file.text();
  }
  return fileContent;
}

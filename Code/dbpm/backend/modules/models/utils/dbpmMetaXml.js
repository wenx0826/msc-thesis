const DBPM_NS = "https://example.com/dbpm";
const DESCRIPTION_ROOT_PATTERN =
  /^\s*(<\?xml[\s\S]*?\?>\s*)?<description\b[^>]*>[\s\S]*<\/description>\s*$/i;
const DESCRIPTION_ROOT_CONTENT_PATTERN =
  /^\s*<description\b[^>]*>([\s\S]*)<\/description>\s*$/i;
const DESCRIPTION_OPEN_TAG_PATTERN = /<description\b[^>]*>/i;
const INNER_DESCRIPTION_ROOT_PATTERN =
  /^\s*(?:<dbpm:info\b[\s\S]*?<\/dbpm:info>\s*)*(<description\b[^>]*(?:\/>|>[\s\S]*<\/description>))\s*$/i;
const DBPM_INFO_BLOCK_PATTERN = /<dbpm:info\b[\s\S]*?<\/dbpm:info>/i;
const DBPM_DOCUMENT_INFO_BLOCK_PATTERN =
  /<dbpm:document_info\b[\s\S]*?<\/dbpm:document_info>/i;

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function indentBlock(block, indentSize) {
  const prefix = " ".repeat(indentSize);
  return block
    .split("\n")
    .map((line) => (line ? `${prefix}${line}` : line))
    .join("\n");
}

function buildDocumentInfoBlock({
  documentId = "",
  documentVersionId = "",
  documentVersionName = "",
  selectedText = "",
}) {
  const lines = [
    "<dbpm:document_info>",
    `  <dbpm:document_id>${escapeXml(documentId)}</dbpm:document_id>`,
    `  <dbpm:document_version_id>${escapeXml(documentVersionId)}</dbpm:document_version_id>`,
  ];

  if (documentVersionName) {
    lines.push(
      `  <dbpm:document_version_name>${escapeXml(documentVersionName)}</dbpm:document_version_name>`,
    );
  }

  lines.push(
    `  <dbpm:text_selections>${escapeXml(selectedText)}</dbpm:text_selections>`,
  );
  lines.push("</dbpm:document_info>");
  return lines.join("\n");
}

function upsertDocumentInfoInInfoBlock(infoBlock, documentInfoBlock) {
  if (DBPM_DOCUMENT_INFO_BLOCK_PATTERN.test(infoBlock)) {
    return infoBlock.replace(
      DBPM_DOCUMENT_INFO_BLOCK_PATTERN,
      documentInfoBlock,
    );
  }

  const infoOpenTagMatch = infoBlock.match(/<dbpm:info\b[^>]*>/i);
  if (!infoOpenTagMatch) {
    return infoBlock;
  }

  const indentedInfo = indentBlock(documentInfoBlock, 2);
  return infoBlock.replace(
    infoOpenTagMatch[0],
    `${infoOpenTagMatch[0]}\n${indentedInfo}`,
  );
}

function buildInfoBlock(documentInfoBlock) {
  return [
    `<dbpm:info xmlns:dbpm="${DBPM_NS}">`,
    indentBlock(documentInfoBlock, 2),
    "</dbpm:info>",
  ].join("\n");
}

function splitXmlDeclaration(xmlString) {
  const xmlDeclMatch = xmlString.match(/^\s*(<\?xml[\s\S]*?\?>)\s*/i);
  if (!xmlDeclMatch) {
    return { declaration: "", body: xmlString.trim() };
  }
  return {
    declaration: xmlDeclMatch[1],
    body: xmlString.slice(xmlDeclMatch[0].length).trim(),
  };
}

export function injectDbpmMeta(modelData, meta = {}) {
  if (typeof modelData !== "string" || !modelData.trim()) {
    throw new Error("Model data must be a non-empty XML string");
  }

  const { declaration, body } = splitXmlDeclaration(modelData);
  const documentInfoBlock = buildDocumentInfoBlock(meta);
  const infoBlock = buildInfoBlock(documentInfoBlock);

  let outputBody;
  if (DESCRIPTION_ROOT_PATTERN.test(body)) {
    if (DBPM_INFO_BLOCK_PATTERN.test(body)) {
      outputBody = body.replace(DBPM_INFO_BLOCK_PATTERN, (matchedInfo) =>
        upsertDocumentInfoInInfoBlock(matchedInfo, documentInfoBlock),
      );
    } else {
      const descriptionOpenTagMatch = body.match(DESCRIPTION_OPEN_TAG_PATTERN);
      if (!descriptionOpenTagMatch) {
        throw new Error("Invalid description XML root");
      }
      outputBody = body.replace(
        DESCRIPTION_OPEN_TAG_PATTERN,
        `${descriptionOpenTagMatch[0]}\n${indentBlock(infoBlock, 2)}`,
      );
    }
  } else {
    outputBody = [
      "<description>",
      indentBlock(infoBlock, 2),
      indentBlock(body, 2),
      "</description>",
    ].join("\n");
  }

  return declaration ? `${declaration}\n${outputBody}` : outputBody;
}

export function getDescription(modelData) {
  if (typeof modelData !== "string" || !modelData.trim()) {
    throw new Error("Model data must be a non-empty XML string");
  }

  const { body } = splitXmlDeclaration(modelData);
  const descriptionMatch = body.match(DESCRIPTION_ROOT_PATTERN);
  if (!descriptionMatch) {
    return null;
  }

  const rootContentMatch = body.match(DESCRIPTION_ROOT_CONTENT_PATTERN);
  if (!rootContentMatch) {
    return descriptionMatch[0];
  }

  const innerDescriptionRootMatch = rootContentMatch[1].match(
    INNER_DESCRIPTION_ROOT_PATTERN,
  );
  return innerDescriptionRootMatch
    ? innerDescriptionRootMatch[1]
    : descriptionMatch[0];
}

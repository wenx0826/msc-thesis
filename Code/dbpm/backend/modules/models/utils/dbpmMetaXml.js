import { DOMParser, XMLSerializer } from "@xmldom/xmldom";

const DBPM_NS = "https://example.com/dbpm";
const serializer = new XMLSerializer();

function makeDOMParser() {
  const errors = [];
  const domParser = new DOMParser({
    errorHandler: {
      error: (msg) => errors.push(msg),
      fatalError: (msg) => errors.push(msg),
    },
  });
  return { domParser, errors };
}

function findChildByLocalName(parent, localName) {
  for (let child = parent.firstChild; child; child = child.nextSibling) {
    if (child.namespaceURI === DBPM_NS && child.localName === localName) {
      return child;
    }
  }
  return null;
}

function clearChildren(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

function makeEl(doc, localName) {
  return doc.createElementNS(DBPM_NS, `dbpm:${localName}`);
}

function addTextEl(doc, parent, localName, value) {
  const el = makeEl(doc, localName);
  el.appendChild(doc.createTextNode(String(value)));
  parent.appendChild(el);
}

function upsertModelInfoBlock(
  doc,
  infoEl,
  { modelId, modelVersionId, modelVersionName },
) {
  let modelInfoEl = findChildByLocalName(infoEl, "model_info");
  if (modelInfoEl) {
    clearChildren(modelInfoEl);
  } else {
    modelInfoEl = makeEl(doc, "model_info");
    infoEl.insertBefore(modelInfoEl, infoEl.firstChild);
  }
  if (modelId != null) addTextEl(doc, modelInfoEl, "model_id", modelId);
  if (modelVersionId != null)
    addTextEl(doc, modelInfoEl, "model_version_id", modelVersionId);
  if (modelVersionName != null)
    addTextEl(doc, modelInfoEl, "model_version_name", modelVersionName);
}

function upsertDocumentInfoBlock(doc, infoEl, meta) {
  const {
    documentId = "",
    documentVersionId = "",
    documentVersionName = "",
    documentFileName = "",
    selections = [],
  } = meta;

  let docInfoEl = findChildByLocalName(infoEl, "document_info");
  if (docInfoEl) {
    clearChildren(docInfoEl);
  } else {
    docInfoEl = makeEl(doc, "document_info");
    const promptsEl = findChildByLocalName(infoEl, "prompts");
    infoEl.insertBefore(docInfoEl, promptsEl ?? null);
  }

  addTextEl(doc, docInfoEl, "document_id", documentId);
  addTextEl(doc, docInfoEl, "document_version_id", documentVersionId);
  if (documentVersionName)
    addTextEl(doc, docInfoEl, "document_version_name", documentVersionName);
  if (documentFileName)
    addTextEl(doc, docInfoEl, "document_file_name", documentFileName);

  const selectionsEl = makeEl(doc, "text_selections");
  docInfoEl.appendChild(selectionsEl);
  for (const text of Array.isArray(selections) ? selections : []) {
    if (text) {
      const selEl = makeEl(doc, "selection");
      selEl.appendChild(doc.createTextNode(text));
      selectionsEl.appendChild(selEl);
    }
  }
}

function upsertPromptsBlock(doc, infoEl, prompt, isReset) {
  if (!prompt) return;

  let promptsEl = findChildByLocalName(infoEl, "prompts");
  if (!promptsEl) {
    promptsEl = makeEl(doc, "prompts");
    infoEl.appendChild(promptsEl);
  }

  if (isReset) {
    clearChildren(promptsEl);
  }

  const promptEl = makeEl(doc, "prompt");
  promptEl.appendChild(doc.createTextNode(prompt));
  promptsEl.appendChild(promptEl);
}

export function injectDbpmMeta(modelData, meta = {}) {
  if (typeof modelData !== "string" || !modelData.trim()) {
    throw new Error("Model data must be a non-empty XML string");
  }

  // Preserve XML declaration
  const xmlDeclMatch = modelData.match(/^\s*(<\?xml[\s\S]*?\?>)\s*/i);
  const declaration = xmlDeclMatch ? xmlDeclMatch[1] : null;
  const body = xmlDeclMatch
    ? modelData.slice(xmlDeclMatch[0].length).trim()
    : modelData.trim();

  // Wrap bare XML in outer <description> if not already wrapped
  const isWrapped = /^\s*<description\b/i.test(body);
  const xmlToParse = isWrapped
    ? body
    : `<description>\n${body}\n</description>`;

  const { domParser, errors } = makeDOMParser();
  const doc = domParser.parseFromString(xmlToParse, "text/xml");
  if (errors.length > 0) {
    throw new Error(`Failed to parse model XML: ${errors[0]}`);
  }

  const outerDesc = doc.documentElement;

  // Find or create <dbpm:info> as first child of outer <description>
  let infoEl = findChildByLocalName(outerDesc, "info");
  if (!infoEl) {
    infoEl = doc.createElementNS(DBPM_NS, "dbpm:info");
    outerDesc.insertBefore(infoEl, outerDesc.firstChild);
  }

  upsertModelInfoBlock(doc, infoEl, meta);
  upsertDocumentInfoBlock(doc, infoEl, meta);
  upsertPromptsBlock(doc, infoEl, meta.prompt ?? null, meta.isReset ?? false);

  const serialized = serializer.serializeToString(doc.documentElement);
  return declaration ? `${declaration}\n${serialized}` : serialized;
}

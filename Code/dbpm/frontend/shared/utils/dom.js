export function createTemplateElement(templateId) {
  const template = document.getElementById(templateId);
  return $(template.content.cloneNode(true)).children().first();
}

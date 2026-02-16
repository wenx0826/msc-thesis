export function $cloneTemplate(templateId) {
  const template = document.getElementById(templateId);
  return $(template.content.cloneNode(true));
}

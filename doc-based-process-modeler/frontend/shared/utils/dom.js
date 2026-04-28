export function createTemplateElement(templateId) {
  const template = document.getElementById(templateId);
  return $(template.content.cloneNode(true)).children().first();
}

export function openLinkInNewTab(url) {
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function createMenu(event, menu, options = {}) {
  new CustomMenu(event).contextmenu(menu);

  if (options.noIcons) {
    $("div.contextmenu").last().addClass("contextmenu--no-icons");
  }
}

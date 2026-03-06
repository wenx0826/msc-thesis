export function scopeSvgIds(svgEl, prefix) {
  if (!svgEl || !prefix) {
    return;
  }

  const idEls = [];
  if (svgEl.getAttribute && svgEl.getAttribute("id")) {
    idEls.push(svgEl);
  }
  svgEl.querySelectorAll("[id]").forEach((el) => idEls.push(el));

  const idMap = new Map();
  idEls.forEach((el) => {
    const oldId = el.getAttribute("id");
    if (!oldId || oldId.startsWith(`${prefix}_`)) {
      return;
    }
    const newId = `${prefix}_${oldId}`;
    idMap.set(oldId, newId);
    el.setAttribute("id", newId);
  });

  if (idMap.size === 0) {
    return;
  }

  const escaped = [...idMap.keys()]
    .sort((a, b) => b.length - a.length)
    .map((key) =>
      key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    );
  const urlRe = new RegExp(
    `url\\(\\s*(['"]?)#(${escaped.join("|")})\\1\\s*\\)`,
    "g",
  );
  const hrefRe = new RegExp(`^#(${escaped.join("|")})$`);
  const urlAttrs = [
    "clip-path",
    "mask",
    "fill",
    "stroke",
    "filter",
    "marker-end",
    "marker-start",
    "marker-mid",
  ];

  const all = [svgEl, ...svgEl.querySelectorAll("*")];
  all.forEach((el) => {
    urlAttrs.forEach((attr) => {
      const value = el.getAttribute(attr);
      if (value && urlRe.lastIndex !== undefined) {
        urlRe.lastIndex = 0;
      }
      if (value && urlRe.test(value)) {
        urlRe.lastIndex = 0;
        el.setAttribute(
          attr,
          value.replace(urlRe, (_, __quote, id) => `url(#${idMap.get(id)})`),
        );
      }
    });

    ["href", "xlink:href"].forEach((attr) => {
      const value = el.getAttribute(attr);
      if (value && hrefRe.test(value)) {
        const oldId = value.slice(1);
        if (idMap.has(oldId)) {
          el.setAttribute(attr, `#${idMap.get(oldId)}`);
        }
      }
    });

    const inlineStyle = el.getAttribute("style");
    if (inlineStyle && urlRe.lastIndex !== undefined) {
      urlRe.lastIndex = 0;
    }
    if (inlineStyle && urlRe.test(inlineStyle)) {
      urlRe.lastIndex = 0;
      el.setAttribute(
        "style",
        inlineStyle.replace(
          urlRe,
          (_, __quote, id) => `url(#${idMap.get(id)})`,
        ),
      );
    }
  });

  svgEl.querySelectorAll("style").forEach((styleEl) => {
    const cssText = styleEl.textContent || "";
    if (!cssText) {
      return;
    }
    urlRe.lastIndex = 0;
    if (!urlRe.test(cssText)) {
      return;
    }
    urlRe.lastIndex = 0;
    styleEl.textContent = cssText.replace(
      urlRe,
      (_, __quote, id) => `url(#${idMap.get(id)})`,
    );
  });

  // The preview renderer can compute label width slightly smaller than the
  // final workspace rendering. Expand label clip regions a bit and move the
  // matching end-cap groups so borders stay aligned.
  const LABEL_CLIP_WIDTH_BUFFER_PX = 18;
  const shiftedEndGroups = new Set();

  svgEl.querySelectorAll('clipPath[id*="ele-"]').forEach((clipPathEl) => {
    const clipId = clipPathEl.getAttribute("id");
    if (!clipId) {
      return;
    }

    const clipRect = clipPathEl.querySelector("rect[width]");
    if (clipRect) {
      const width = parseFloat(clipRect.getAttribute("width"));
      if (Number.isFinite(width) && width > 0) {
        clipRect.setAttribute("width", String(width + LABEL_CLIP_WIDTH_BUFFER_PX));
      }
    }

    const escapedClipId = clipId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const clipRefRe = new RegExp(
      `url\\(\\s*(['"]?)#${escapedClipId}\\1\\s*\\)`,
    );

    svgEl.querySelectorAll("[clip-path]").forEach((candidate) => {
      const clipPathRef = candidate.getAttribute("clip-path") || "";
      if (!clipRefRe.test(clipPathRef)) {
        return;
      }

      const parent = candidate.parentElement;
      if (!parent) {
        return;
      }

      Array.from(parent.children).forEach((sibling) => {
        const classList = sibling.classList;
        if (
          !classList ||
          (!classList.contains("part-end") && !classList.contains("part-extra"))
        ) {
          return;
        }

        if (shiftedEndGroups.has(sibling)) {
          return;
        }

        shiftTranslateX(sibling, LABEL_CLIP_WIDTH_BUFFER_PX);
        shiftedEndGroups.add(sibling);
      });
    });
  });

}

function shiftTranslateX(el, deltaX) {
  const transform = el.getAttribute("transform");
  if (!transform) {
    return;
  }

  const match = transform.match(
    /translate\(\s*([+-]?\d*\.?\d+)(?:[\s,]+([+-]?\d*\.?\d+))?\s*\)/,
  );
  if (!match) {
    return;
  }

  const x = parseFloat(match[1]);
  if (!Number.isFinite(x)) {
    return;
  }

  const y = match[2];
  const separator = match[0].includes(",") ? ", " : " ";
  const replacement =
    y !== undefined
      ? `translate(${x + deltaX}${separator}${y})`
      : `translate(${x + deltaX})`;

  el.setAttribute("transform", transform.replace(match[0], replacement));
}

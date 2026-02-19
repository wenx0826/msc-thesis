(function () {
  const PREVIEW_LABEL_SELECTOR = "#modelGridSmall";
  const PREVIEW_CANVAS_SELECTOR = "#modelCanvasSmall";

  let previewRenderQueue = Promise.resolve();
  let previewAdaptor = null;
  let previewThemePath = null;
  let endpointSymbolXmlByName = {};
  let endpointSymbolByName = {};
  let endpointPropertiesByName = {};

  function getContainers() {
    if (!window.$) {
      throw new Error("jQuery is not available in graph renderer iframe");
    }
    const $svg = window.$(PREVIEW_CANVAS_SELECTOR);
    const $label = window.$(PREVIEW_LABEL_SELECTOR);
    if ($svg.length === 0 || $label.length === 0) {
      throw new Error("Preview render container not found in renderer iframe");
    }
    return { $svg, $label };
  }

  function clearPreviewRenderContainers(preserveDefs) {
    const { $svg, $label } = getContainers();
    if (preserveDefs) {
      $svg.children().not("defs").remove();
      $svg.find("> defs > [belongs-to=element]").remove();
    } else {
      $svg.empty();
    }
    $svg.attr("width", "1").attr("height", "1");
    $label.children().not($svg).remove();
  }

  function parseDescriptionElement(descriptionXml) {
    const parsed = window.$.parseXML(descriptionXml);
    const parseError = parsed.getElementsByTagName("parsererror")[0];
    if (parseError) {
      throw new Error(parseError.textContent || "Invalid model XML");
    }
    if (parsed.documentElement && parsed.documentElement.nodeName === "description") {
      return parsed.documentElement;
    }
    const description = parsed.getElementsByTagName("description")[0];
    if (!description) {
      throw new Error("Model XML does not contain a description element");
    }
    return description;
  }

  function updateEndpointData(endpointSymbols, endpointProperties) {
    const nextSymbols = endpointSymbols || {};
    const nextProperties = endpointProperties || {};

    Object.keys(endpointSymbolXmlByName).forEach((endpoint) => {
      if (!(endpoint in nextSymbols)) {
        delete endpointSymbolXmlByName[endpoint];
        delete endpointSymbolByName[endpoint];
      }
    });

    Object.entries(nextSymbols).forEach(([endpoint, symbolXml]) => {
      if (endpointSymbolXmlByName[endpoint] === symbolXml) {
        return;
      }
      endpointSymbolXmlByName[endpoint] = symbolXml;
      try {
        const parsed = window.$.parseXML(symbolXml);
        endpointSymbolByName[endpoint] = parsed.documentElement;
      } catch (err) {
        endpointSymbolByName[endpoint] = undefined;
      }
    });

    endpointPropertiesByName = nextProperties;
  }

  function ensurePreviewAdaptor(themePath) {
    if (previewAdaptor && previewThemePath === themePath) {
      return Promise.resolve(previewAdaptor);
    }

    previewThemePath = themePath;
    previewAdaptor = null;
    clearPreviewRenderContainers(false);

    const { $svg, $label } = getContainers();

    return new Promise((resolve, reject) => {
      try {
        new window.WfAdaptor(themePath, function (graphrealization) {
          try {
            graphrealization.illustrator.get_symbol = (target) =>
              endpointSymbolByName[target];
            graphrealization.illustrator.get_properties = (target) =>
              endpointPropertiesByName[target];
            graphrealization.set_svg_container($svg);
            graphrealization.set_label_container($label);
            previewAdaptor = graphrealization;
            resolve(graphrealization);
          } catch (err) {
            reject(err);
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  function renderGraphPreview(payload) {
    const run = previewRenderQueue.then(async () => {
      if (!payload || typeof payload !== "object") {
        throw new Error("renderGraphPreview payload is required");
      }
      const { themePath, descriptionXml, endpointSymbols, endpointProperties } =
        payload;
      if (!themePath || typeof themePath !== "string") {
        throw new Error("renderGraphPreview requires a themePath");
      }
      if (!descriptionXml || typeof descriptionXml !== "string") {
        throw new Error("renderGraphPreview requires a descriptionXml string");
      }
      if (!window.WfAdaptor) {
        throw new Error("WfAdaptor is not available in graph renderer iframe");
      }

      updateEndpointData(endpointSymbols, endpointProperties);
      const adaptor = await ensurePreviewAdaptor(themePath);

      const descriptionElement = parseDescriptionElement(descriptionXml);
      clearPreviewRenderContainers(true);
      adaptor.set_description(window.$(descriptionElement), true);

      const svgNode = window.document.querySelector(PREVIEW_CANVAS_SELECTOR);
      if (!svgNode) {
        throw new Error("Preview SVG container is missing in renderer iframe");
      }
      const svgString = new window.XMLSerializer().serializeToString(svgNode);
      clearPreviewRenderContainers(true);
      return svgString;
    });

    previewRenderQueue = run.catch(() => {});
    return run;
  }

  window.renderGraphPreview = renderGraphPreview;
})();

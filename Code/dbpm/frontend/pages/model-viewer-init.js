(function () {
  const PREVIEW_LABEL_SELECTOR = "#modelGridSmall";
  const PREVIEW_CANVAS_SELECTOR = "#modelCanvasSmall";
  const PREVIEW_THEME_PATH =
    "modules/model/themes/preset_customized/theme.js";
  const ENDPOINTS_BASE_PATH = "/modules/model/endpoints/";
  const ENDPOINT_NAMES = ["subprocess"];

  let previewRenderQueue = Promise.resolve();
  let previewAdaptor = null;
  let previewThemePath = null;
  let endpointSymbolXmlByName = {};
  let endpointSymbolByName = {};
  let endpointPropertiesByName = {};
  let previewFontsReadyPromise = null;

  function ensurePreviewFontsReady() {
    if (previewFontsReadyPromise) {
      return previewFontsReadyPromise;
    }

    const fonts = window.document?.fonts;
    if (!fonts || typeof fonts.load !== "function") {
      previewFontsReadyPromise = Promise.resolve();
      return previewFontsReadyPromise;
    }

    const waitWithTimeout = Promise.race([
      Promise.allSettled([fonts.load("14px adawaita-sans"), fonts.ready]),
      new Promise((resolve) => {
        window.setTimeout(resolve, 1500);
      }),
    ]);

    previewFontsReadyPromise = waitWithTimeout.then(() => undefined);
    return previewFontsReadyPromise;
  }

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
      const {
        themePath,
        descriptionXml,
        endpointSymbols,
        endpointProperties,
        keepRenderedOutput = false,
      } = payload;
      if (!themePath || typeof themePath !== "string") {
        throw new Error("renderGraphPreview requires a themePath");
      }
      if (!descriptionXml || typeof descriptionXml !== "string") {
        throw new Error("renderGraphPreview requires a descriptionXml string");
      }
      if (!window.WfAdaptor) {
        throw new Error("WfAdaptor is not available in graph renderer iframe");
      }

      await ensurePreviewFontsReady();
      updateEndpointData(endpointSymbols, endpointProperties);
      const adaptor = await ensurePreviewAdaptor(themePath);

      clearPreviewRenderContainers(true);
      const parsedXml = window.$.parseXML(descriptionXml);
      const parseError = parsedXml.getElementsByTagName("parsererror")[0];
      if (parseError) {
        throw new Error(parseError.textContent || "Invalid model XML");
      }
      adaptor.set_description(window.$(parsedXml.documentElement), true);

      const svgNode = window.document.querySelector(PREVIEW_CANVAS_SELECTOR);
      if (!svgNode) {
        throw new Error("Preview SVG container is missing in renderer iframe");
      }
      const svgString = new window.XMLSerializer().serializeToString(svgNode);
      if (!keepRenderedOutput) {
        clearPreviewRenderContainers(true);
      }
      return svgString;
    });

    previewRenderQueue = run.catch(() => {});
    return run;
  }

  function setStandaloneStatus(text, state = "info") {
    const statusEl = window.document.getElementById("graphRenderStatus");
    if (!statusEl) return;

    if (!text) {
      statusEl.textContent = "";
      statusEl.style.display = "none";
      statusEl.removeAttribute("data-state");
      return;
    }

    statusEl.textContent = text;
    statusEl.style.display = "block";
    statusEl.setAttribute("data-state", state);
  }

  function getRequestedModelVersionId() {
    const params = new URLSearchParams(window.location.search);
    return (
      params.get("model_version_id") ||
      params.get("modelVersionId") ||
      params.get("version_id") ||
      params.get("versionId")
    );
  }

  async function fetchModelXml(modelVersionId) {
    const encodedVersionId = encodeURIComponent(modelVersionId);
    const response = await fetch(
      `${window.location.origin}/models/versions/${encodedVersionId}/data`,
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch model version ${modelVersionId}`);
    }

    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    if (contentType.includes("application/json")) {
      const payload = await response.json();
      if (typeof payload === "string") {
        return payload;
      }
      if (typeof payload?.data === "string") {
        return payload.data;
      }
      throw new Error("Model version payload is not XML text");
    }

    return await response.text();
  }

  async function loadEndpointPreviewData() {
    const endpointSymbols = {};
    const endpointProperties = {};

    await Promise.all(
      ENDPOINT_NAMES.map(async (endpoint) => {
        try {
          const [symbolResponse, propertiesResponse] = await Promise.all([
            fetch(`${ENDPOINTS_BASE_PATH}${endpoint}/symbol.svg`),
            fetch(`${ENDPOINTS_BASE_PATH}${endpoint}/properties.json`),
          ]);

          if (symbolResponse.ok) {
            endpointSymbols[endpoint] = await symbolResponse.text();
          }
          if (propertiesResponse.ok) {
            endpointProperties[endpoint] = await propertiesResponse.json();
          }
        } catch (err) {
          console.warn(
            `Unable to load endpoint preview assets for "${endpoint}"`,
            err,
          );
        }
      }),
    );

    return { endpointSymbols, endpointProperties };
  }

  async function renderStandaloneGraphFromQuery() {
    const modelVersionId = getRequestedModelVersionId();
    if (!modelVersionId) return;

    setStandaloneStatus("Loading model graph...");
    try {
      const [descriptionXml, endpointPayload] = await Promise.all([
        fetchModelXml(modelVersionId),
        loadEndpointPreviewData(),
      ]);
      const previewThemeUrl = new URL(
        PREVIEW_THEME_PATH,
        window.document.baseURI,
      ).toString();

      await renderGraphPreview({
        themePath: previewThemeUrl,
        descriptionXml,
        endpointSymbols: endpointPayload.endpointSymbols,
        endpointProperties: endpointPayload.endpointProperties,
        keepRenderedOutput: true,
      });
      setStandaloneStatus("");
    } catch (err) {
      console.error("Error rendering standalone model graph:", err);
      setStandaloneStatus(
        err?.message || "Failed to render model graph preview",
        "error",
      );
    }
  }

  window.renderGraphPreview = renderGraphPreview;

  if (window.document.readyState === "loading") {
    window.document.addEventListener("DOMContentLoaded", () => {
      renderStandaloneGraphFromQuery();
    });
  } else {
    renderStandaloneGraphFromQuery();
  }
})();

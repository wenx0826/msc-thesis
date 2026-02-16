export const endpointAPI = {
  _cache: null,
  _boundGetSymbol: null,
  _boundGetProperties: null,

  init() {
    if (this._cache) return;

    const basePath = "/pages/workspace/workflow/wf_endpoints/subprocess/";

    // Inline symbol for immediate availability (no async delay)
    const svgString = `<g xmlns="http://www.w3.org/2000/svg">
      <g class="part-normal">
        <rect x="1" y="1" width="28" height="28" rx="4" class="execstyle colorstyle stand"/>
        <path class="colorstyle execstyle stand" d="m 2 22 l 13 0 l 0 -14 l -13 0"/>
        <path class="stand" d="m 5 15 l 6 0"/>
        <path class="stand" d="m 8 12 l 0 6"/>
      </g>
      <g class="part-start" clip-path="url(#startclip)">
        <rect x="1" y="1" width="38" height="28" rx="4" class="execstyle colorstyle stand"/>
        <path class="colorstyle execstyle stand" d="m 2 22 l 13 0 l 0 -14 l -13 0"/>
        <path class="stand" d="m 5 15 l 6 0"/>
        <path class="stand" d="m 8 12 l 0 6"/>
      </g>
      <g class="part-end" clip-path="url(#endclip)">
        <rect x="1" y="1" width="28" height="28" rx="4" class="execstyle colorstyle stand"/>
      </g>
      <g class="part-middle" transform="translate(19,0)">
        <rect x="0" y="1" width="220" height="28" class="standwithout colorstyle"/>
        <line x1="0" y1="1" x2="220" y2="1" class="standline execstyle" />
        <line x1="0" y1="29" x2="221" y2="29" class="standline execstyle" />
        <text transform="translate(0,20)" class="label"></text>
      </g>
    </g>`;

    const svgDoc = new DOMParser().parseFromString(svgString, "image/svg+xml");

    // Initialize cache with symbol immediately available
    this._cache = {
      subprocess: {
        symbol: svgDoc.documentElement,
        properties: null,
        schema: null,
      },
    };

    // Bind methods once for reuse (avoids re-binding on every call)
    this._boundGetSymbol = this.getSymbol.bind(this);
    this._boundGetProperties = this.getProperties.bind(this);

    // Load properties and schema asynchronously (not needed for initial render)
    Promise.all([
      fetch(basePath + "properties.json").then((r) => r.json()),
      fetch(basePath + "schema.rng").then((r) => r.text()),
    ])
      .then(([properties, schemaText]) => {
        this._cache.subprocess.properties = properties;
        this._cache.subprocess.schema = new DOMParser().parseFromString(
          schemaText,
          "application/xml",
        );
        console.log("[API.endpoint] Subprocess properties & schema loaded");
      })
      .catch((err) =>
        console.error("[API.endpoint] Failed to load subprocess files:", err),
      );
  },

  getSymbol(target) {
    this.init();
    return this._cache[target]?.symbol;
  },

  getProperties(target) {
    this.init();
    return this._cache[target]?.properties;
  },

  getSchema(target) {
    this.init();
    return this._cache[target]?.schema;
  },
};

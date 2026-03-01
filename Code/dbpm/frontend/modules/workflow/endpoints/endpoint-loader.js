// Define available endpoints - add new endpoint names here
const ENDPOINTS = ["subprocess"];

export const endpointLoader = {
  _cache: null,
  _boundGetSymbol: null,
  _boundGetProperties: null,
  _initPromise: null,

  async init() {
    if (this._cache) return this._initPromise;

    // Store the initialization promise so multiple calls wait for the same init
    if (this._initPromise) return this._initPromise;

    this._initPromise = this._doInit();
    return this._initPromise;
  },

  async _doInit() {
    const basePath = "/modules/workflow/endpoints/";

    // Initialize cache for all endpoints with null values
    this._cache = {};
    for (const endpoint of ENDPOINTS) {
      this._cache[endpoint] = {
        symbol: null,
        properties: null,
        schema: null,
      };
    }

    // Bind methods once for reuse (avoids re-binding on every call)
    this._boundGetSymbol = this.getSymbol.bind(this);
    this._boundGetProperties = this.getProperties.bind(this);

    // Load symbol, properties, and schema asynchronously for all endpoints
    const loadPromises = ENDPOINTS.map((endpoint) =>
      Promise.all([
        fetch(`${basePath}${endpoint}/symbol.svg`).then((r) => r.text()),
        fetch(`${basePath}${endpoint}/properties.json`).then((r) => r.json()),
        fetch(`${basePath}${endpoint}/schema.rng`).then((r) => r.text()),
      ])
        .then(([symbolText, properties, schemaText]) => {
          this._cache[endpoint].symbol = $.parseXML(symbolText).documentElement;
          this._cache[endpoint].properties = properties;
          this._cache[endpoint].schema = $.parseXML(schemaText).documentElement;
          console.log(
            `[endpoint-loader] Loaded symbol, properties & schema for: ${endpoint}`,
          );
        })
        .catch((err) => {
          console.error(
            `[endpoint-loader] Failed to load files for ${endpoint}:`,
            err,
          );
        }),
    );

    await Promise.all(loadPromises);
    console.log(
      `[endpoint-loader] All ${ENDPOINTS.length} endpoint(s) initialized`,
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

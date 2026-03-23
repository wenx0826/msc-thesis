// Define available endpoints - add new endpoint names here
const ENDPOINTS = ["subprocess"];
const ENDPOINTS_BASE_URL = new URL("./", import.meta.url);

function getEndpointAssetUrl(endpoint, fileName) {
  return new URL(`./${endpoint}/${fileName}`, ENDPOINTS_BASE_URL).toString();
}

async function fetchEndpointText(endpoint, fileName) {
  const response = await fetch(getEndpointAssetUrl(endpoint, fileName));
  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${fileName} for ${endpoint} (${response.status})`,
    );
  }
  return response.text();
}

async function fetchEndpointJson(endpoint, fileName) {
  const response = await fetch(getEndpointAssetUrl(endpoint, fileName));
  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${fileName} for ${endpoint} (${response.status})`,
    );
  }
  return response.json();
}

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
        fetchEndpointText(endpoint, "symbol.svg"),
        fetchEndpointJson(endpoint, "properties.json"),
        fetchEndpointText(endpoint, "schema.rng"),
      ])
        .then(([symbolText, properties, schemaText]) => {
          this._cache[endpoint].symbol = $.parseXML(symbolText).documentElement;
          this._cache[endpoint].properties = properties;
          this._cache[endpoint].schema = $.parseXML(schemaText);
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

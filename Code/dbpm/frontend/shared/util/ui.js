export function createUI(spec = {}) {
  const { setup, bindListeners, subscribeStores } = spec;

  function init() {
    const context = setup?.() ?? {};
    bindListeners?.(context);
    subscribeStores?.(context);
    return context;
  }

  const context = init();
  return { init, context };
}

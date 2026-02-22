export async function createUI(spec = {}) {
  const { setup, bindListeners, subscribeStores } = spec;

  async function init() {
    const ctx = (await setup?.()) ?? {};
    bindListeners?.(ctx);
    subscribeStores?.(ctx);
    return ctx;
  }

  const ctx = await init();
  return { init, ctx };
}

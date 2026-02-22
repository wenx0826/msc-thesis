export function createStore(initialState, options = {}) {
  const subs = new Set();
  return {
    state: { ...initialState },
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    notify(patch) {
      subs.forEach((fn) => fn(this.state, patch));
    },
  };
}

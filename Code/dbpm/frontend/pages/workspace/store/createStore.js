// Utility to create a domain store with subscribe/notify pattern
export function createDomainStore(initialState, options = {}) {
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

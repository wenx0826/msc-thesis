export class Store {
  constructor(initialState = {}) {
    this.state = { ...initialState };
    this.subscribers = new Set();
  }

  subscribe(fn) {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  notify(patch) {
    this.subscribers.forEach((fn) => fn(this.state, patch));
  }
}

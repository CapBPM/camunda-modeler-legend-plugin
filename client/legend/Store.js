const STORE_KEY = 'LegendPluginStore';

export class LegendPluginStore {
  store = {};

  constructor() {
    this.initStore();
  }

  initStore() {
    this.store = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
  }

  save(id, legendModel) {
    this.store[id] = legendModel;
    localStorage.setItem(STORE_KEY, JSON.stringify(this.store));
  }

  remove(id) {
    const { [id]: remove, ...rest } = this.store;
    this.store = rest;
    localStorage.setItem(STORE_KEY, JSON.stringify(this.store));
  }

  get(id) {
    return this.store[id];
  }
}

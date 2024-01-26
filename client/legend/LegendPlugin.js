import domify from 'domify';
import { LegendPluginStore } from './Store'
import { EVENTS } from './constants';

const PLUGIN_NAME = 'LegendPlugin';

class LegendPlugin {
  colors = new Map();
  legendElement = null;
  store = new LegendPluginStore();

  constructor(canvas, eventBus, elementRegistry) {
    this.elementRegistry = elementRegistry;
    this.container = canvas.getContainer().parentNode;
    this.eventBus = eventBus;
    this.legendElement = new LegendElement(this.colors, this.container);
    this.onElementChange();
    this.onElementCreation();
    this.onTabSave();
    this.onModelerLoaded();
  }

  onElementCreation() {
    this.eventBus.on(['shape.added', 'connection.added'], (event) => {
      this.addColorOnLegend(event.element);
    });
  }

  onElementChange() {
    this.eventBus.on(['element.changed', 'connection.changed'], (event) => {
      this.addColorOnLegend(event.element);
    });
  }

  onTabSave() {
    this.eventBus.on(EVENTS.TAB_SAVE, ({ id }) => {
      if (this.colors.size) {
        const colorData = [...this.colors.entries()].reduce((data, [key, palleteColor]) => {
          data[key] = palleteColor.model;
          return data;
        }, {});
        this.store.save(id, colorData);
      }
    });
  }

  onModelerLoaded() {
    this.eventBus.on(EVENTS.MODELER_LOADED, ({ id }) => {
      const data = this.store.get(id);
      if (data) {
        Object.entries(data).forEach(([key, { fill, stroke, label, isElement }]) => {
          this.colors.set(key, new PaletteColor(label, isElement, stroke, fill));
        });
        this.updateLegend();
      }
    });
  }

  addColorOnLegend(element) {
    const { stroke } = element.di;
    if (stroke) {
      this.addPaletteColor(element);
      this.updateLegend();
    }
  }

  addPaletteColor(element) {
    const { stroke, fill } = element.di;
    const id = PaletteColor.createId(stroke, fill);
    if (this.colors.has(id)) return;
    const label = `System ${this.colors.size + 1}`;
    if (this.isConnection(element)) {
      this.colors.set(id, new PaletteColor(label, false, stroke));
    } else {
      this.colors.set(id, new PaletteColor(label, true, stroke, fill));
    }
  }

  isConnection(element) {
    return !!element.waypoints;
  }

  updateLegend() {
    if (this.legendElement) {
      this.legendElement.remove()
    }
    this.legendElement.create();
  }
}

LegendPlugin.$inject = [
  'canvas',
  'eventBus',
  'elementRegistry',
]

class PaletteColor {
  constructor(label, isElement, stroke, fill) {
    this.label = label || 'System';
    this.isElement = isElement;
    this.stroke = stroke;
    this.fill = fill;
  }

  get id() {
    return PaletteColor.createId(this.stroke, this.fill);
  }

  get model() {
    return { label: this.label, isElement: this.isElement, stroke: this.stroke, fill: this.fill };
  }

  get style() {
    if (!this.isElement) return `background-color: ${this.stroke};`;
    return `background-color: ${this.fill};`;
  }

  static createId(stroke, fill) {
    const fillId = (fill || '').replace('#', '');
    const strokeId = stroke.replace('#', '');
    return `color_${strokeId}_${fillId}`;
  }
}

class LegendElement {
  element = null;
  listenets = new Map();

  constructor(colors, container) {
    this.colors = colors;
    this.container = container;
  }

  create() {
    this.element = domify(this.getHtml());
    this.container.appendChild(this.element);
    this.addListeners();
  }

  remove() {
    if (this.element) {
      this.removeListeners();
      this.container.removeChild(this.element);
    }
  }

  getHtml() {
    const colors = [...this.colors.values()];
    return `
    <div class="legend">
      ${colors.map((palleteColor) => {
      return `<div class="legend-item">
          <div class="legend-item-color" style="${palleteColor.style}"></div>
          <input type="text" id="${palleteColor.id}" class="legend-item-input" value="${palleteColor.label}" />
        </div>`;
    }).join('\n')}
    </div>`
  }

  addListeners() {
    [...this.colors.keys()].forEach((key) => {
      const cb = ({ target }) => this.colors.get(key).label = target.value;
      this.listenets.set(key, cb);
      this.element.querySelector(`#${key}`).addEventListener('blur', cb);
    });
  }

  removeListeners() {
    [...this.listenets.keys()].forEach((key) => {
      this.element.querySelector(`#${key}`).removeEventListener('blur', this.listenets.get(key));
    });
    this.listenets.clear()
  }
}

export default {
  __init__: [PLUGIN_NAME],
  [PLUGIN_NAME]: ['type', LegendPlugin]
};

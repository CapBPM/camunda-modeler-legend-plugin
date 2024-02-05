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
      this.addColor(event.element);
    });
  }

  onElementChange() {
    this.eventBus.on(['element.changed', 'connection.changed'], (event) => {
      if (event.element.di?.stroke) {
        this.addColor(event.element);
      }
      this.clearColors();
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

  addColor(element) {
    const { stroke } = element.di;
    if (stroke) {
      this.addPaletteColor(element);
      this.updateLegend();
    }
  }

  clearColors() {
    const existing = this.elementRegistry.getAll().reduce((ids, { di }) => {
      const { stroke, fill } = di;
      if (!stroke) return ids;
      return ids.add(PaletteColor.createId(stroke, fill));
    }, new Set());

    [...this.colors.keys()]
      .filter((key) => !existing.has(key))
      .forEach((key) => this.colors.delete(key));
    this.updateLegend();

    if (this.colors.size === 0) {
      this.legendElement.remove();
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

  updateLegend() {
    this.legendElement?.update();
  }

  isConnection(element) {
    return !!element.waypoints;
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
  dragParams = null;
  content = null;

  constructor(colors, container) {
    this.colors = colors;
    this.container = container;
    this.container.addEventListener('mousemove', this.onDrag);
  }

  get dragBar() {
    return this.element.querySelector('.drag-bar');
  }

  update() {
    if (!this.element) {
      this.createLegendPanel();
      this.content = new LegendContent(this.colors, this.element, this.removeColor);
    }
    this.content.destroyContent();
    this.content.createContent();
  }

  createLegendPanel() {
    const panel = `<div class="legend">
      <div class="drag-bar"></div>
    </div>`
    this.element = domify(panel);
    this.container.appendChild(this.element);
    this.draggable();
  }

  remove() {
    if (this.element) {
      this.content?.destroyContent();
      this.element.removeEventListener('mouseup', this.endDrag);
      this.dragBar?.removeEventListener('mousedown', this.startDrag);
      this.container.removeChild(this.element);
      this.container.removeEventListener('mouseleave', this.endDrag);
      this.element = null;
    }
  }

  removeColor = (colorId) => {
    this.colors.delete(colorId);
    if (!this.colors.size) {
      this.remove();
    }
  }

  draggable() {
    this.dragBar?.addEventListener('mousedown', this.startDrag);
    this.element.addEventListener('mouseup', this.endDrag);
    this.container.addEventListener('mouseleave', this.endDrag);
  }

  startDrag = (event) => {
    const { offsetX, offsetY } = event;
    this.dragParams = { dx: offsetX, dy: offsetY };
  }

  onDrag = (event) => {
    if (this.dragParams && this.element) {
      const { x, y } = event;
      const { dx, dy } = this.dragParams;
      this.element.style.left = `${x - dx}px`;
      this.element.style.top = `${y - 28 - dy}px`;
    }
  }

  endDrag = () => {
    this.dragParams = null;
  }
}

class LegendContent {
  /*
    in the array: [1, 2, 3]
    on UI: 1
           2
           3
  */
  items = [];

  constructor(colors, legend, removeColor) {
    this.colors = colors;
    this.parent = legend;
    this.removeColor = removeColor;
  }

  createContent() {
    if (!this.parent) throw new Error('Creating content before parend init!');
    this.items = [...this.colors.values()].map((color) => new LegendItem(color, this.onMove, this.onRemove));
    this.items.forEach(({ element }) => this.parent.appendChild(element));
  }

  destroyContent() {
    this.items.forEach((item) => {
      item.destoy();
      this.parent.removeChild(item.element);
    });
    this.items = [];
  }

  onRemove = (item) => {
    const index = this.items.indexOf(item);
    if (index > -1) {
      this.parent.removeChild(item.element);
      this.items.splice(index, 1);
      this.removeColor(item.color.id);
      // this.colors.delete(item.color.id);
    }
  }

  onMove = (direction, item, el) => {
    if (direction === 'up') this.moveUp(item);
    if (direction === 'down') this.moveDown(item);
  }

  moveUp(item) {
    const index = this.items.indexOf(item);
    if (index === 0) {
      this.parent.appendChild(item.element);
      this.swapItems(item, this.items.at(-1));
    } else {
      const itemToSwap = this.items.at(index - 1);
      this.parent.insertBefore(item.element, itemToSwap.element);
      this.swapItems(item, itemToSwap);
    }
  }

  moveDown(item) {
    const index = this.items.indexOf(item);
    if (index === this.items.length - 1) {
      this.parent.insertBefore(item.element, this.items.at(0).element);
      this.swapItems(item, this.items.at(0));
    } else {
      const itemToSwap = this.items.at(index + 1);
      this.parent.insertBefore(itemToSwap.element, item.element);
      this.swapItems(item, itemToSwap);
    }
  }

  swapItems(item, itemToSwap) {
    const index = this.items.indexOf(item);
    const swapIndex = this.items.indexOf(itemToSwap);
    if ([index, swapIndex].includes(-1)) throw new Error('There is no such colors!');
    this.items[swapIndex] = item;
    this.items[index] = itemToSwap;
  }
}

class LegendItem {
  constructor(palleteColor, onMove, onRemove) {
    this.color = palleteColor;
    this.element = domify(this.getHtml());
    this.onMove = onMove;
    this.onRemove = onRemove;
    this.addListeners();
  }

  get menu() {
    return this.element.querySelector('.legend-item-menu') || null;
  }

  destoy() {
    this.onMove = undefined;
    this.onRemove = undefined;
    this.removeEventListeners();
  }

  getHtml() {
    return `<div class="legend-item">
    <div class="legend-item-color" style="${this.color.style}"></div>
    <input type="text" id="${this.color.id}" class="legend-item-input" value="${this.color.label}" />
    <div class="legend-item-action">
      <button class="legend-item-menu-toggle"></button>
    </div>

    <div class="legend-item-menu" tabindex="0">
      <button class="cap-btn cap-action-btn arrow-btn up" title="Move Up"></button>
      <button class="cap-btn cap-action-btn arrow-btn down" title="Move Down"></button>
      <button class="cap-btn cap-action-btn text-red" data-action="remove" title="Remove">&times;</button>
    </div>
  </div>`
  }

  addListeners() {
    this.element.querySelector(`#${this.color.id}`).addEventListener('blur', this.onBlur);
    this.element.querySelector(`.arrow-btn.up`).addEventListener('mousedown', this.onMoveUpBtnClick);
    this.element.querySelector(`.arrow-btn.down`).addEventListener('mousedown', this.onMoveDownBtnClick);
    this.element.querySelector(`button[data-action="remove"]`).addEventListener('mousedown', this.onRemoveBtnClick);
    this.element.querySelector(`.legend-item-menu-toggle`).addEventListener('click', this.openMenu);
    this.menu.addEventListener('blur', this.closeMenu);
  }

  removeEventListeners() {
    this.element.querySelector(`#${this.color.id}`).removeEventListener('blur', this.onBlur);
    this.element.querySelector(`.arrow-btn.up`).removeEventListener('mousedown', this.onMoveUpBtnClick);
    this.element.querySelector(`.arrow-btn.down`).removeEventListener('mousedown', this.onMoveDownBtnClick);
    this.element.querySelector(`button[data-action="remove"]`).removeEventListener('mousedown', this.onRemoveBtnClick);
    this.element.querySelector(`.legend-item-menu-toggle`).removeEventListener('click', this.openMenu);
    this.menu.removeEventListener('blur', this.closeMenu);
  }

  onBlur = ({ target }) => {
    this.color.label = target.value;
  }

  onMoveUpBtnClick = () => {
    this.onMove('up', this, this.element);
    setTimeout(() => {
      this.openMenu();
    }, 0);
  }

  onMoveDownBtnClick = () => {
    this.onMove('down', this, this.element);
    setTimeout(() => {
      this.openMenu();
    }, 0);
  }

  onRemoveBtnClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    this.onRemove(this);
  }

  openMenu = () => {
    if (this.menu) {
      this.menu.style.width = 'max-content';
      this.menu.style.height = 'max-content';
      this.menu.style.border = '1px #000 solid';
      this.menu.focus();
    }
  }

  closeMenu = () => {
    if (this.menu) {
      this.menu.style.width = 0;
      this.menu.style.height = 0;
      this.menu.style.border = 0;
    }
  }
}

export default {
  __init__: [PLUGIN_NAME],
  [PLUGIN_NAME]: ['type', LegendPlugin]
};

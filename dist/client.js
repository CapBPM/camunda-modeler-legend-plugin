/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./client/legend/EditorEvents.js":
/*!***************************************!*\
  !*** ./client/legend/EditorEvents.js ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ EditorEvents)
/* harmony export */ });
/* harmony import */ var camunda_modeler_plugin_helpers_react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! camunda-modeler-plugin-helpers/react */ "./node_modules/camunda-modeler-plugin-helpers/react.js");
/* harmony import */ var camunda_modeler_plugin_helpers_react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(camunda_modeler_plugin_helpers_react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _constants__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./constants */ "./client/legend/constants.js");



class EditorEvents extends camunda_modeler_plugin_helpers_react__WEBPACK_IMPORTED_MODULE_0__.PureComponent {
  modelers = new Map();

  constructor(props) {
    super(props);
    this.subscribe = props.subscribe;
    this.onModelerCreate();
    this.onTabSave();
  }

  onModelerCreate() {
    this.subscribe('bpmn.modeler.created', (event) => {
      const { tab, modeler } = event;
      this.modelers.set(tab.id, new ModelerData(modeler, tab.id));
    });
  }

  onTabSave() {
    this.subscribe('tab.saved', ({ tab }) => {
      const modelerData = this.modelers.get(tab.id);
      if (modelerData) {
        const { eventBus, definitionId } = modelerData;
        eventBus.fire(_constants__WEBPACK_IMPORTED_MODULE_1__.EVENTS.TAB_SAVE, { id: definitionId });
      }
    });
  }

  render() {
    return null;
  }
}

class ModelerData {
  constructor(modeler, tabId) {
    this.tabId = tabId;
    this.modeler = modeler;
    this.eventBus = modeler.get('eventBus');
    this.fireInitEvent();
  }

  get definitionId() {
    return this.modeler._definitions.id;
  }

  fireInitEvent() {
    const interval = setInterval(() => {
      if (this.modeler._definitions) {
        clearInterval(interval);
        this.eventBus.fire(_constants__WEBPACK_IMPORTED_MODULE_1__.EVENTS.MODELER_LOADED, { id: this.definitionId });
      }
    }, 100);
  }
}

/***/ }),

/***/ "./client/legend/LegendPlugin.js":
/*!***************************************!*\
  !*** ./client/legend/LegendPlugin.js ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var domify__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! domify */ "./node_modules/domify/index.js");
/* harmony import */ var domify__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(domify__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _Store__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./Store */ "./client/legend/Store.js");
/* harmony import */ var _constants__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./constants */ "./client/legend/constants.js");




const PLUGIN_NAME = 'LegendPlugin';

class LegendPlugin {
  colors = new Map();
  legendElement = null;
  store = new _Store__WEBPACK_IMPORTED_MODULE_0__.LegendPluginStore();

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
    this.eventBus.on(_constants__WEBPACK_IMPORTED_MODULE_1__.EVENTS.TAB_SAVE, ({ id }) => {
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
    this.eventBus.on(_constants__WEBPACK_IMPORTED_MODULE_1__.EVENTS.MODELER_LOADED, ({ id }) => {
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
    this.element = domify__WEBPACK_IMPORTED_MODULE_2___default()(panel);
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
    this.element = domify__WEBPACK_IMPORTED_MODULE_2___default()(this.getHtml());
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

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({
  __init__: [PLUGIN_NAME],
  [PLUGIN_NAME]: ['type', LegendPlugin]
});


/***/ }),

/***/ "./client/legend/Store.js":
/*!********************************!*\
  !*** ./client/legend/Store.js ***!
  \********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "LegendPluginStore": () => (/* binding */ LegendPluginStore)
/* harmony export */ });
const STORE_KEY = 'LegendPluginStore';

class LegendPluginStore {
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


/***/ }),

/***/ "./client/legend/constants.js":
/*!************************************!*\
  !*** ./client/legend/constants.js ***!
  \************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "EVENTS": () => (/* binding */ EVENTS)
/* harmony export */ });
const EVENTS = {
  TAB_SAVE: 'legendPlugin.tabSave',
  MODELER_LOADED: 'legendPlugin.modelerLoaded',
}

/***/ }),

/***/ "./node_modules/camunda-modeler-plugin-helpers/index.js":
/*!**************************************************************!*\
  !*** ./node_modules/camunda-modeler-plugin-helpers/index.js ***!
  \**************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "getModelerDirectory": () => (/* binding */ getModelerDirectory),
/* harmony export */   "getPluginsDirectory": () => (/* binding */ getPluginsDirectory),
/* harmony export */   "registerBpmnJSModdleExtension": () => (/* binding */ registerBpmnJSModdleExtension),
/* harmony export */   "registerBpmnJSPlugin": () => (/* binding */ registerBpmnJSPlugin),
/* harmony export */   "registerClientExtension": () => (/* binding */ registerClientExtension),
/* harmony export */   "registerClientPlugin": () => (/* binding */ registerClientPlugin),
/* harmony export */   "registerCloudBpmnJSModdleExtension": () => (/* binding */ registerCloudBpmnJSModdleExtension),
/* harmony export */   "registerCloudBpmnJSPlugin": () => (/* binding */ registerCloudBpmnJSPlugin),
/* harmony export */   "registerDmnJSModdleExtension": () => (/* binding */ registerDmnJSModdleExtension),
/* harmony export */   "registerDmnJSPlugin": () => (/* binding */ registerDmnJSPlugin),
/* harmony export */   "registerPlatformBpmnJSModdleExtension": () => (/* binding */ registerPlatformBpmnJSModdleExtension),
/* harmony export */   "registerPlatformBpmnJSPlugin": () => (/* binding */ registerPlatformBpmnJSPlugin)
/* harmony export */ });
/**
 * Validate and register a client plugin.
 *
 * @param {Object} plugin
 * @param {String} type
 */
function registerClientPlugin(plugin, type) {
  var plugins = window.plugins || [];
  window.plugins = plugins;

  if (!plugin) {
    throw new Error('plugin not specified');
  }

  if (!type) {
    throw new Error('type not specified');
  }

  plugins.push({
    plugin: plugin,
    type: type
  });
}

/**
 * Validate and register a client plugin.
 *
 * @param {import('react').ComponentType} extension
 *
 * @example
 *
 * import MyExtensionComponent from './MyExtensionComponent';
 *
 * registerClientExtension(MyExtensionComponent);
 */
function registerClientExtension(component) {
  registerClientPlugin(component, 'client');
}

/**
 * Validate and register a bpmn-js plugin.
 *
 * @param {Object} module
 *
 * @example
 *
 * import {
 *   registerBpmnJSPlugin
 * } from 'camunda-modeler-plugin-helpers';
 *
 * const BpmnJSModule = {
 *   __init__: [ 'myService' ],
 *   myService: [ 'type', ... ]
 * };
 *
 * registerBpmnJSPlugin(BpmnJSModule);
 */
function registerBpmnJSPlugin(module) {
  registerClientPlugin(module, 'bpmn.modeler.additionalModules');
}

/**
 * Validate and register a platform specific bpmn-js plugin.
 *
 * @param {Object} module
 *
 * @example
 *
 * import {
 *   registerPlatformBpmnJSPlugin
 * } from 'camunda-modeler-plugin-helpers';
 *
 * const BpmnJSModule = {
 *   __init__: [ 'myService' ],
 *   myService: [ 'type', ... ]
 * };
 *
 * registerPlatformBpmnJSPlugin(BpmnJSModule);
 */
function registerPlatformBpmnJSPlugin(module) {
  registerClientPlugin(module, 'bpmn.platform.modeler.additionalModules');
}

/**
 * Validate and register a cloud specific bpmn-js plugin.
 *
 * @param {Object} module
 *
 * @example
 *
 * import {
 *   registerCloudBpmnJSPlugin
 * } from 'camunda-modeler-plugin-helpers';
 *
 * const BpmnJSModule = {
 *   __init__: [ 'myService' ],
 *   myService: [ 'type', ... ]
 * };
 *
 * registerCloudBpmnJSPlugin(BpmnJSModule);
 */
function registerCloudBpmnJSPlugin(module) {
  registerClientPlugin(module, 'bpmn.cloud.modeler.additionalModules');
}

/**
 * Validate and register a bpmn-moddle extension plugin.
 *
 * @param {Object} descriptor
 *
 * @example
 * import {
 *   registerBpmnJSModdleExtension
 * } from 'camunda-modeler-plugin-helpers';
 *
 * var moddleDescriptor = {
 *   name: 'my descriptor',
 *   uri: 'http://example.my.company.localhost/schema/my-descriptor/1.0',
 *   prefix: 'mydesc',
 *
 *   ...
 * };
 *
 * registerBpmnJSModdleExtension(moddleDescriptor);
 */
function registerBpmnJSModdleExtension(descriptor) {
  registerClientPlugin(descriptor, 'bpmn.modeler.moddleExtension');
}

/**
 * Validate and register a platform specific bpmn-moddle extension plugin.
 *
 * @param {Object} descriptor
 *
 * @example
 * import {
 *   registerPlatformBpmnJSModdleExtension
 * } from 'camunda-modeler-plugin-helpers';
 *
 * var moddleDescriptor = {
 *   name: 'my descriptor',
 *   uri: 'http://example.my.company.localhost/schema/my-descriptor/1.0',
 *   prefix: 'mydesc',
 *
 *   ...
 * };
 *
 * registerPlatformBpmnJSModdleExtension(moddleDescriptor);
 */
function registerPlatformBpmnJSModdleExtension(descriptor) {
  registerClientPlugin(descriptor, 'bpmn.platform.modeler.moddleExtension');
}

/**
 * Validate and register a cloud specific bpmn-moddle extension plugin.
 *
 * @param {Object} descriptor
 *
 * @example
 * import {
 *   registerCloudBpmnJSModdleExtension
 * } from 'camunda-modeler-plugin-helpers';
 *
 * var moddleDescriptor = {
 *   name: 'my descriptor',
 *   uri: 'http://example.my.company.localhost/schema/my-descriptor/1.0',
 *   prefix: 'mydesc',
 *
 *   ...
 * };
 *
 * registerCloudBpmnJSModdleExtension(moddleDescriptor);
 */
function registerCloudBpmnJSModdleExtension(descriptor) {
  registerClientPlugin(descriptor, 'bpmn.cloud.modeler.moddleExtension');
}

/**
 * Validate and register a dmn-moddle extension plugin.
 *
 * @param {Object} descriptor
 *
 * @example
 * import {
 *   registerDmnJSModdleExtension
 * } from 'camunda-modeler-plugin-helpers';
 *
 * var moddleDescriptor = {
 *   name: 'my descriptor',
 *   uri: 'http://example.my.company.localhost/schema/my-descriptor/1.0',
 *   prefix: 'mydesc',
 *
 *   ...
 * };
 *
 * registerDmnJSModdleExtension(moddleDescriptor);
 */
function registerDmnJSModdleExtension(descriptor) {
  registerClientPlugin(descriptor, 'dmn.modeler.moddleExtension');
}

/**
 * Validate and register a dmn-js plugin.
 *
 * @param {Object} module
 *
 * @example
 *
 * import {
 *   registerDmnJSPlugin
 * } from 'camunda-modeler-plugin-helpers';
 *
 * const DmnJSModule = {
 *   __init__: [ 'myService' ],
 *   myService: [ 'type', ... ]
 * };
 *
 * registerDmnJSPlugin(DmnJSModule, [ 'drd', 'literalExpression' ]);
 * registerDmnJSPlugin(DmnJSModule, 'drd')
 */
function registerDmnJSPlugin(module, components) {

  if (!Array.isArray(components)) {
    components = [ components ]
  }

  components.forEach(c => registerClientPlugin(module, `dmn.modeler.${c}.additionalModules`)); 
}

/**
 * Return the modeler directory, as a string.
 *
 * @deprecated Will be removed in future Camunda Modeler versions without replacement.
 *
 * @return {String}
 */
function getModelerDirectory() {
  return window.getModelerDirectory();
}

/**
 * Return the modeler plugin directory, as a string.
 *
 * @deprecated Will be removed in future Camunda Modeler versions without replacement.
 *
 * @return {String}
 */
function getPluginsDirectory() {
  return window.getPluginsDirectory();
}

/***/ }),

/***/ "./node_modules/camunda-modeler-plugin-helpers/react.js":
/*!**************************************************************!*\
  !*** ./node_modules/camunda-modeler-plugin-helpers/react.js ***!
  \**************************************************************/
/***/ ((module) => {

if (!window.react) {
  throw new Error('Not compatible with Camunda Modeler < 3.4');
}

/**
 * React object used by Camunda Modeler. Use it to create UI extension.
 *
 * @type {import('react')}
 */
module.exports = window.react;

/***/ }),

/***/ "./node_modules/domify/index.js":
/*!**************************************!*\
  !*** ./node_modules/domify/index.js ***!
  \**************************************/
/***/ ((module) => {

const wrapMap = {
	legend: [1, '<fieldset>', '</fieldset>'],
	tr: [2, '<table><tbody>', '</tbody></table>'],
	col: [2, '<table><tbody></tbody><colgroup>', '</colgroup></table>'],
	_default: [0, '', ''],
};

wrapMap.td
= wrapMap.th = [3, '<table><tbody><tr>', '</tr></tbody></table>'];

wrapMap.option
= wrapMap.optgroup = [1, '<select multiple="multiple">', '</select>'];

wrapMap.thead
= wrapMap.tbody
= wrapMap.colgroup
= wrapMap.caption
= wrapMap.tfoot = [1, '<table>', '</table>'];

wrapMap.polyline
= wrapMap.ellipse
= wrapMap.polygon
= wrapMap.circle
= wrapMap.text
= wrapMap.line
= wrapMap.path
= wrapMap.rect
= wrapMap.g = [1, '<svg xmlns="http://www.w3.org/2000/svg" version="1.1">', '</svg>'];

function domify(htmlString, document = globalThis.document) {
	if (typeof htmlString !== 'string') {
		throw new TypeError('String expected');
	}

	// Handle comment nodes
	const commentMatch = /^<!--(.*?)-->$/s.exec(htmlString);
	if (commentMatch) {
		return document.createComment(commentMatch[1]);
	}

	const tagName = /<([\w:]+)/.exec(htmlString)?.[1];

	if (!tagName) {
		return document.createTextNode(htmlString);
	}

	htmlString = htmlString.trim();

	// Body support
	if (tagName === 'body') {
		const element = document.createElement('html');
		element.innerHTML = htmlString;
		const {lastChild} = element;
		lastChild.remove();
		return lastChild;
	}

	// Wrap map
	let [depth, prefix, suffix] = Object.hasOwn(wrapMap, tagName) ? wrapMap[tagName] : wrapMap._default;
	let element = document.createElement('div');
	element.innerHTML = prefix + htmlString + suffix;
	while (depth--) {
		element = element.lastChild;
	}

	// One element
	if (element.firstChild === element.lastChild) {
		const {firstChild} = element;
		firstChild.remove();
		return firstChild;
	}

	// Several elements
	const fragment = document.createDocumentFragment();
	fragment.append(...element.childNodes);

	return fragment;
}

module.exports = domify;


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be in strict mode.
(() => {
"use strict";
/*!*************************!*\
  !*** ./client/index.js ***!
  \*************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var camunda_modeler_plugin_helpers__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! camunda-modeler-plugin-helpers */ "./node_modules/camunda-modeler-plugin-helpers/index.js");
/* harmony import */ var _legend_LegendPlugin__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./legend/LegendPlugin */ "./client/legend/LegendPlugin.js");
/* harmony import */ var _legend_EditorEvents__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./legend/EditorEvents */ "./client/legend/EditorEvents.js");




(0,camunda_modeler_plugin_helpers__WEBPACK_IMPORTED_MODULE_0__.registerBpmnJSPlugin)(_legend_LegendPlugin__WEBPACK_IMPORTED_MODULE_1__["default"]);
(0,camunda_modeler_plugin_helpers__WEBPACK_IMPORTED_MODULE_0__.registerClientExtension)(_legend_EditorEvents__WEBPACK_IMPORTED_MODULE_2__["default"])

})();

/******/ })()
;
//# sourceMappingURL=client.js.map
import { PureComponent } from 'camunda-modeler-plugin-helpers/react';
import { EVENTS } from './constants';

export default class EditorEvents extends PureComponent {
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
        eventBus.fire(EVENTS.TAB_SAVE, { id: definitionId });
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
        this.eventBus.fire(EVENTS.MODELER_LOADED, { id: this.definitionId });
      }
    }, 100);
  }
}
import { registerBpmnJSPlugin, registerClientExtension } from 'camunda-modeler-plugin-helpers';
import LegendPlugin from './legend/LegendPlugin';
import EditorEvents from './legend/EditorEvents';

registerBpmnJSPlugin(LegendPlugin);
registerClientExtension(EditorEvents)

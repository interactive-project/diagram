import type {DiagramConfig,DiagramState} from '@interactive-project/diagram';
import {createDiagramPorts} from '@interactive-project/diagram';
import {validateDiagramConfig} from '@interactive-project/diagram/validation';
declare const config:DiagramConfig;const ports=createDiagramPorts({activity:config,validateConfig:validateDiagramConfig,deletionPolicy:'cascade'});void ports;declare const state:DiagramState;const id:string=state.graph.nodes[0]!.id;void id;

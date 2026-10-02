export type {Attributes,Port,DiagramNode,DiagramGroup,Endpoint,DiagramEdge,Graph,DiagramConfig,DiagramState} from './types/diagram.js';
import type {DiagramConfig} from './types/diagram.js';
import type {StatePorts} from '@interactive-project/core';
export class DiagramError extends Error {readonly code:string;constructor(code:string)}
export function copyDiagram(input:unknown):unknown;
export function createDiagramPorts(options:{activity:DiagramConfig;validateConfig:(input:unknown)=>{valid:boolean};deletionPolicy?:'reject'|'cascade'}):StatePorts;

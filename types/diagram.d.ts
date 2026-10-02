import type {ContentNode} from '@interactive-project/content-node';
export type Attributes=Readonly<Record<string,string|number|boolean|null>>;
export interface Port {readonly id:string;readonly role:'input'|'output'|'bidirectional';readonly dataType:string}
export interface DiagramNode {readonly id:string;readonly kind:string;readonly attributes:Attributes;readonly ports:readonly Port[];readonly groupId:string|null;readonly label?:ContentNode}
export interface DiagramGroup {readonly id:string;readonly attributes:Attributes;readonly parentId:string|null;readonly label?:ContentNode}
export interface Endpoint {readonly nodeId:string;readonly portId:string|null}
export interface DiagramEdge {readonly id:string;readonly directed:boolean;readonly source:Endpoint;readonly target:Endpoint;readonly attributes:Attributes;readonly label?:ContentNode}
export interface Graph {readonly nodes:readonly DiagramNode[];readonly edges:readonly DiagramEdge[];readonly groups:readonly DiagramGroup[]}
export interface DiagramConfig {readonly schemaVersion:'1.0.0';readonly graph:Graph;readonly view?:{readonly positions:Readonly<Record<string,{readonly x:number;readonly y:number}>>;readonly layoutHints?:{readonly algorithm:string;readonly direction:'left-right'|'right-left'|'top-bottom'|'bottom-top'}}}
export interface DiagramState {readonly stateVersion:'1.0.0';readonly deletionPolicy:'reject'|'cascade';readonly graph:Graph}

import {copyGeneratedJson} from '@interactive-project/protocol/generation/json';
import {canonicalJson} from '@interactive-project/protocol/interoperability';
export class DiagramError extends Error{constructor(code){super('Diagram operation rejected.');this.name='DiagramError';this.code=code;}}
export function copyDiagram(input){const r=copyGeneratedJson(input,{maxBytes:2097152,maxDepth:32,maxCollectionSize:1000,maxStringLength:100000,maxNodes:50000});if(!r.valid)throw new DiagramError('diagram.nonJson');return r.value;}
const collections={node:'nodes',edge:'edges',group:'groups'};
export function createDiagramPorts({activity:input,validateConfig,deletionPolicy='reject'}){
 const activity=copyDiagram(input);if(typeof validateConfig!=='function'||!['reject','cascade'].includes(deletionPolicy))throw new DiagramError('diagram.options');
 function valid(input){let r;try{r=validateConfig(input);}catch{}if(r&&typeof r.then==='function'){Promise.resolve(r).catch(()=>{});return false;}return r?.valid===true;}
 if(!valid(activity))throw new DiagramError('diagram.config');let disposed=false;
 const initialState=spec=>{if(disposed||spec.type!=='interactive-project/diagram'||canonicalJson(spec.config)!==canonicalJson(activity))throw new DiagramError('diagram.activity');return copyDiagram({stateVersion:'1.0.0',deletionPolicy,graph:activity.graph});};
 function apply(graph,operation){
  if(!operation||typeof operation!=='object'||Object.keys(operation).some(k=>!['kind','entity','id','value','changes'].includes(k)))throw new DiagramError('diagram.action');
  const name=collections[operation.entity];if(!name)throw new DiagramError('diagram.action');const list=graph[name];
  if(operation.kind==='add'||operation.kind==='connect'){if(operation.kind==='connect'&&operation.entity!=='edge'||!operation.value||Object.keys(operation).sort().join(',')!=='entity,kind,value')throw new DiagramError('diagram.action');list.push(operation.value);return;}
  if(typeof operation.id!=='string')throw new DiagramError('diagram.action');const index=list.findIndex(v=>v.id===operation.id);if(index<0)throw new DiagramError('diagram.missing');
  if(operation.kind==='update'){if(Object.keys(operation).sort().join(',')!=='changes,entity,id,kind'||!operation.changes||Array.isArray(operation.changes)||typeof operation.changes!=='object'||Object.hasOwn(operation.changes,'id'))throw new DiagramError('diagram.action');list[index]={...list[index],...operation.changes};return;}
  if(operation.kind!=='remove'||Object.keys(operation).sort().join(',')!=='entity,id,kind')throw new DiagramError('diagram.action');
  if(deletionPolicy==='cascade'){
   if(operation.entity==='node')graph.edges=graph.edges.filter(e=>e.source.nodeId!==operation.id&&e.target.nodeId!==operation.id);
   if(operation.entity==='group'){
    const groups=new Set([operation.id]);let previous;do{previous=groups.size;for(const g of graph.groups)if(groups.has(g.parentId))groups.add(g.id);}while(groups.size!==previous);
    const nodes=new Set(graph.nodes.filter(n=>groups.has(n.groupId)).map(n=>n.id));graph.nodes=graph.nodes.filter(n=>!nodes.has(n.id));graph.edges=graph.edges.filter(e=>!nodes.has(e.source.nodeId)&&!nodes.has(e.target.nodeId));graph.groups=graph.groups.filter(g=>!groups.has(g.id));return;
   }
  }
  list.splice(index,1);
 }
 function reduceChecked(state,action){
  if(disposed)throw new DiagramError('diagram.disposed');if(state.stateVersion!=='1.0.0'||state.deletionPolicy!==deletionPolicy)throw new DiagramError('diagram.state');
  let operations;const kind=action.type?.replace(/^interactive-project\/diagram\./,'');
  if(kind==='batch'){if(!action.payload||Object.keys(action.payload).join(',')!=='operations'||!Array.isArray(action.payload.operations)||action.payload.operations.length<1||action.payload.operations.length>64)throw new DiagramError('diagram.action');operations=action.payload.operations;}
  else{if(!['add','update','remove','connect'].includes(kind)||!action.payload||Object.hasOwn(action.payload,'kind'))throw new DiagramError('diagram.action');operations=[{...action.payload,kind}];}
  const next=JSON.parse(canonicalJson(state));for(const operation of operations)apply(next.graph,operation);
  if(!valid({schemaVersion:'1.0.0',graph:next.graph}))throw new DiagramError('diagram.graph');return {accepted:true,state:copyDiagram(next)};
 }
 return Object.freeze({initialState,reduce:(state,action)=>{try{return reduceChecked(state,action);}catch{return{accepted:false};}},evaluate:(state,context,revision)=>copyDiagram({protocolVersion:'1.0.0',resultVersion:'1.0.0',activityId:context.identity.activityId,sessionId:context.identity.sessionId,...(context.identity.attemptId===undefined?{}:{attemptId:context.identity.attemptId}),revision,evidence:[],status:'unevaluable',reason:'unassessed'}),dispose(){disposed=true;}});
}

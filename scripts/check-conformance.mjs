import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createDiagramPorts} from '../index.js';
import {validateDiagramConfig} from '../validation/index.js';
import {createRuntime} from '@interactive-project/core';
import {validateActivitySpec} from '@interactive-project/protocol/validation';
import {validateAction,validateResult} from '@interactive-project/protocol/validation/interoperability';
import {validateEvent} from '@interactive-project/events/validation';
import ts from 'typescript';
const uuid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0'),read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url))),clone=v=>JSON.parse(JSON.stringify(v));
for(const file of readdirSync(new URL('../fixtures/',import.meta.url))){const r=validateDiagramConfig(read('fixtures/'+file));assert.equal(r.valid,file.includes('.valid.'),file+JSON.stringify(r));}
let event=100,actionId=200;
function runtime(config,deletionPolicy='reject'){
 const activity={protocolVersion:'1.0.0',id:uuid(1),type:'interactive-project/diagram',activitySchemaVersion:'1.0.0',metadata:{title:'Diagram'},config};
 const r=createRuntime({activity,sessionId:uuid(2),sourceId:uuid(4),engineId:'interactive-project/diagram',engineStateVersion:'1.0.0',clock:()=>0,random:()=>0,nextEventId:()=>uuid(event++),validators:{activity:validateActivitySpec,action:validateAction,result:validateResult,event:validateEvent},ports:createDiagramPorts({activity:config,validateConfig:validateDiagramConfig,deletionPolicy})});r.start();
 const dispatch=(kind,payload)=>r.dispatch({protocolVersion:'1.0.0',actionVersion:'1.0.0',id:uuid(actionId++),activityId:uuid(1),sessionId:uuid(2),sequence:r.getState().revision,type:'interactive-project/diagram.'+kind,payload});return{r,dispatch};
}
for(const name of ['circuit','concept','nested']){
 const config=read('fixtures/'+name+'.valid.json'),a=runtime(config),b=runtime(config);assert.deepEqual(a.r.getState(),b.r.getState());const id=config.graph.nodes[0].id,operation={entity:'node',id,changes:{attributes:{updated:true}}};assert.equal(a.dispatch('update',operation).status,'accepted');assert.equal(b.dispatch('update',operation).status,'accepted');assert.deepEqual(a.r.getState(),b.r.getState());assert(!('view' in a.r.getState().state));assert(Object.isFrozen(a.r.getState().state.graph.nodes));assert.equal(a.r.evaluate().status,'unevaluable');a.r.dispose();b.r.dispose();
}
{
 const config=read('fixtures/concept.valid.json'),{r,dispatch}=runtime(config),before=r.getState();
 assert.equal(dispatch('remove',{entity:'node',id:'idea'}).status,'rejected');assert.equal(r.getState(),before);
 assert.equal(dispatch('update',{entity:'node',id:'idea',changes:{id:'renamed'}}).status,'rejected');assert.equal(r.getState(),before);
 assert.equal(dispatch('batch',{operations:[{kind:'update',entity:'node',id:'idea',changes:{attributes:{updated:true}}},{kind:'remove',entity:'node',id:'missing'}]}).status,'rejected');assert.equal(r.getState(),before);
 assert.equal(dispatch('batch',{operations:[{kind:'remove',entity:'node',id:'idea'},{kind:'remove',entity:'edge',id:'relation'}]}).status,'accepted');assert.equal(r.getState().state.graph.nodes.length,1);assert.equal(r.getState().state.graph.edges.length,0);const after=r.getState();assert.equal(dispatch('remove',{entity:'node',id:'idea'}).status,'rejected');assert.equal(r.getState(),after);r.dispose();
}
{
 const {r,dispatch}=runtime(read('fixtures/nested.valid.json'),'cascade');assert.equal(dispatch('remove',{entity:'group',id:'parent'}).status,'accepted');assert.equal(r.getState().state.graph.groups.length,0);assert.deepEqual(r.getState().state.graph.nodes.map(n=>n.id),['outside']);assert.equal(r.getState().state.graph.edges.length,0);r.dispose();
 const circuit=runtime(read('fixtures/circuit.valid.json'),'cascade');assert.equal(circuit.dispatch('remove',{entity:'node',id:'battery'}).status,'accepted');assert.equal(circuit.r.getState().state.graph.edges.length,0);circuit.r.dispose();
}
{
 const {r,dispatch}=runtime(read('fixtures/concept.valid.json'));assert.equal(dispatch('add',{entity:'node',value:{id:'new',kind:'concept',attributes:{},ports:[],groupId:null}}).status,'accepted');assert.equal(dispatch('connect',{entity:'edge',value:{id:'newEdge',directed:false,source:{nodeId:'related',portId:null},target:{nodeId:'new',portId:null},attributes:{}}}).status,'accepted');const before=r.getState();assert.equal(dispatch('connect',{entity:'edge',value:{id:'newEdge',directed:true,source:{nodeId:'missing',portId:null},target:{nodeId:'new',portId:null},attributes:{}}}).status,'rejected');assert.equal(r.getState(),before);r.dispose();
}
const config=read('fixtures/concept.valid.json'),changed=clone(config);changed.view={positions:{idea:{x:500,y:-500}}};const a=runtime(config),b=runtime(changed);assert.deepEqual(a.r.getState().state,b.r.getState().state);a.r.dispose();b.r.dispose();
const program=ts.createProgram([new URL('./type-consumer.mts',import.meta.url).pathname],{strict:true,noEmit:true,module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext,lib:['lib.es2022.d.ts']});const diagnostics=ts.getPreEmitDiagnostics(program);assert.equal(diagnostics.length,0,diagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText,'\n')).join('\n'));
console.log('Diagram model: circuit/concept/nested fixtures, global IDs/ports/cycles/content/view validation, real Core deterministic actions, atomic rollback and explicit deletion policies passed.');

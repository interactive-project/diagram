import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {validateContent} from '@interactive-project/content-node/validation';
import {copyDiagram} from '../index.js';
const require=createRequire(import.meta.url),ajv=new Ajv2020({strict:true,allErrors:true,ownProperties:true,allowUnionTypes:true});addFormats(ajv);
for(const name of ['@interactive-project/protocol/schemas/shared-content.v1.schema.json','@interactive-project/content-node/schemas/content-node.v1.schema.json'])ajv.addSchema(JSON.parse(readFileSync(require.resolve(name))));
const schema=ajv.compile(JSON.parse(readFileSync(new URL('../schemas/diagram-activity.v1.schema.json',import.meta.url))));
const error=(code,path)=>({code,path,severity:'error',message:'The diagram violates its declared graph contract.'});
export function validateDiagramConfig(input){
 let config;try{config=copyDiagram(input);}catch{return{valid:false,diagnostics:[error('diagram.nonJson','')]};}
 if(!schema(config))return{valid:false,diagnostics:[error('diagram.schema','')]};
 const diagnostics=[],ids=new Set(),nodes=new Map(config.graph.nodes.map(n=>[n.id,n])),groups=new Map(config.graph.groups.map(g=>[g.id,g]));
 function register(value,path){if(ids.has(value.id))diagnostics.push(error('diagram.duplicateId',path+'/id'));ids.add(value.id);if(value.label){const r=validateContent(value.label);if(!r.valid)diagnostics.push(...r.diagnostics.map(d=>({...d,path:path+'/label'+d.path})));}}
 for(const [kind,values]of Object.entries(config.graph))values.forEach((v,i)=>{const p='/graph/'+kind+'/'+i;register(v,p);if(kind==='nodes'){v.ports.forEach((port,j)=>register(port,p+'/ports/'+j));if(v.groupId!==null&&!groups.has(v.groupId))diagnostics.push(error('diagram.group',p+'/groupId'));}if(kind==='groups'){if(v.parentId!==null&&!groups.has(v.parentId))diagnostics.push(error('diagram.group',p+'/parentId'));const seen=new Set([v.id]);let parent=v.parentId;while(parent!==null&&groups.has(parent)){if(seen.has(parent)){diagnostics.push(error('diagram.groupCycle',p+'/parentId'));break;}seen.add(parent);parent=groups.get(parent).parentId;}}});
 config.graph.edges.forEach((edge,i)=>{const p='/graph/edges/'+i,ports=[];for(const side of ['source','target']){const endpoint=edge[side],node=nodes.get(endpoint.nodeId);if(!node){diagnostics.push(error('diagram.dangling',p+'/'+side+'/nodeId'));ports.push(null);continue;}const port=endpoint.portId===null?null:node.ports.find(x=>x.id===endpoint.portId);ports.push(port);if(endpoint.portId!==null&&!port)diagnostics.push(error('diagram.port',p+'/'+side+'/portId'));if(port&&(edge.directed?(side==='source'?port.role==='input':port.role==='output'):port.role!=='bidirectional'))diagnostics.push(error('diagram.portDirection',p+'/'+side+'/portId'));}
  if(ports[0]&&ports[1]&&ports[0].dataType!==ports[1].dataType)diagnostics.push(error('diagram.portType',p+'/target/portId'));});
 for(const key of Object.keys(config.view?.positions??{}))if(!nodes.has(key))diagnostics.push(error('diagram.viewReference','/view/positions/'+key));
 return diagnostics.length?{valid:false,diagnostics}:{valid:true,diagnostics:[]};
}

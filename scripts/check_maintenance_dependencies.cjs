const fs=require('node:fs'),vm=require('node:vm'),ts=require(process.cwd()+'/node_modules/typescript'),assert=require('node:assert/strict');
const source=fs.readFileSync('components/service-status-panel.tsx','utf8');
const js=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const opts=ts.transpileModule(fs.readFileSync('lib/maintenance-options.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const o={};vm.runInNewContext(opts,{exports:o});
let state=[],cursor=0,requests=[];
const jsx=(type,props)=>({type,props}); const exportsObj={};
vm.runInNewContext(js,{exports:exportsObj,require:n=>n.endsWith('.css')?{}:n==='react/jsx-runtime'?{jsx,jsxs:jsx}:n==='react'?{useState:v=>{const i=cursor++;if(!(i in state))state[i]=v;return[state[i],v=>state[i]=typeof v==='function'?v(state[i]):v]},useEffect:()=>{}}:n==='lucide-react'?new Proxy({},{get:(_,k)=>k}):n==='@/lib/maintenance-options'?o:n==='@/lib/notice-duration'?{emptyNoticeDuration:{},noticeDurationMinutes:()=>120}:assert.fail(n),fetch:async(url,init)=>{requests.push(JSON.parse(init.body));return{ok:true,json:async()=>({active:true})}}});
const render=()=>{cursor=0;return exportsObj.default()};
function nodes(tree,result=[]){if(!tree||typeof tree!=='object')return result;if(tree.props){result.push(tree);for(const c of Object.values(tree.props))if(Array.isArray(c))c.forEach(x=>nodes(x,result));else nodes(c,result)}return result}
function control(tree,label){return nodes(tree).find(n=>n.type==='input'&&n.props['aria-label']===label)}
const tournament=tree=>control(tree,'Pause Shootouts during maintenance'),contribution=tree=>control(tree,'Pause Shared uploads & suggestions during maintenance');
let tree=render();assert.equal(contribution(tree).props.checked,true);assert.equal(contribution(tree).props.disabled,true);assert.equal(contribution(tree).props['aria-describedby'],'maintenance-contributions-dependency');
tournament(tree).props.onChange({target:{checked:false}});tree=render();assert.equal(contribution(tree).props.checked,false);assert.equal(contribution(tree).props.disabled,false);
contribution(tree).props.onChange({target:{checked:true}});tree=render();tournament(tree).props.onChange({target:{checked:true}});tree=render();assert.equal(contribution(tree).props.disabled,true);tournament(tree).props.onChange({target:{checked:false}});tree=render();assert.equal(contribution(tree).props.checked,true,'Independent pause survives parent round trip');
tournament(tree).props.onChange({target:{checked:true}});tree=render();state[1]=['shootouts'];state[4]={active:false};tree=render();
const publish=nodes(tree).find(n=>n.type==='button'&&n.props.className==='maintenance-publish');publish.props.onClick();
setImmediate(()=>{assert.deepEqual(requests[0].lockedFeatures,['shootouts'],'Derived UI must not overwrite separate saved preference');console.log('PASS derived pause, disabled explanation, both restored preferences, and unchanged publication payload. Synthetic UI only.');});

import fs from 'node:fs';
import assert from 'node:assert/strict';
import postcss from 'postcss';

// Report exact-selector declarations superseded in the same cascade context.
// Never infer that a class is unused from static JSX: runtime states create classes.
const files=['app/globals.css','app/welcome.css','app/curve-credits/style.css','app/my-data/style.css','app/music-library/style.css','app/preference-tuning/style.css','app/owner-research/admin-layout.css','components/aura-nav-link.css','components/legacy-review.css','components/comparison-data-settings.css','components/results-profile.css','components/admin-review.css'];
const apply=process.argv.includes('--apply'),report=[];
for(const file of files){
 const source=fs.readFileSync(file,'utf8'),root=postcss.parse(source,{from:file});
 let removed=0;
 function clean(parent){
  const seen=new Map();
  for(const node of [...(parent.nodes||[])]){
   if(node.type==='atrule'){clean(node);continue;}
   if(node.type!=='rule')continue;
   // Comma lists must be identical; no selector implication assumptions.
   const key=node.selector.trim();
   if(!seen.has(key))seen.set(key,new Map());
   const props=seen.get(key);
   for(const d of [...node.nodes]){
    if(d.type!=='decl')continue;
    const old=props.get(d.prop);
    if(old && (!old.important||d.important)){
     // Retain intentional browser support fallbacks using distinct values.
     // SVG/gradient replacement and ordinary colors/dimensions are supported here.
     const fallback=/^(display|mask|backdrop-filter|appearance|position)$/.test(d.prop)&&old.value!==d.value;
     if(!fallback){old.remove();removed++;}
    }
    if(!old||!old.important||d.important)props.set(d.prop,d);
   }
  }
 }
 clean(root);
 root.walkRules(r=>{if(!r.nodes.length)r.remove();});
 root.walkAtRules(r=>{if(r.nodes&&!r.nodes.length)r.remove();});
 const output=root.toString().replace(/\n{3,}/g,'\n\n');
 if(apply)fs.writeFileSync(file,output);
 report.push({file,removedDeclarations:removed,beforeBytes:Buffer.byteLength(source),afterBytes:Buffer.byteLength(output)});
}
if(apply)fs.writeFileSync('artifacts/full-flow-qa/cleanup/site-css-summary.json',JSON.stringify(report,null,2)+'\n');
else assert.equal(report.reduce((n,r)=>n+r.removedDeclarations,0),0,'Duplicate superseded declarations remain; review before applying cleanup');
console.log(JSON.stringify(report,null,2));

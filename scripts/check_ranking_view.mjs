import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import {renderToStaticMarkup} from 'react-dom/server';

// Render the actual page fragment against deliberately different protocol and
// headphone cohorts. No database or participant records are used.
const page=readFileSync(new URL('../app/shootout/page.tsx',import.meta.url),'utf8');
const pageAst=ts.createSourceFile('page.tsx',page,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const rankingBranches=[];
function findRanking(node){if(ts.isJsxExpression(node)&&node.expression&&ts.isBinaryExpression(node.expression)&&node.expression.left.getText(pageAst)==='tab === "rankings"'&&node.expression.right.getText(pageAst).includes('const view='))rankingBranches.push(node.expression.right.getText(pageAst));ts.forEachChild(node,findRanking);}
findRanking(pageAst);assert.equal(rankingBranches.length,1,'Find the actual ranking body rather than a navigation/eyebrow branch');
const expression=rankingBranches[0];
const source=`export function ranking({research,rankProtocol,rankMode,rankType}) { const setRankMode=()=>{},setRankType=()=>{},setRankProtocol=()=>{}; return (${expression}); }`;
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const componentContext=vm.createContext({exports:{},require:createRequire(import.meta.url)});vm.runInContext(ts.transpileModule(readFileSync("components/ranking-change-explanation.tsx","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,componentContext);
const context=vm.createContext({exports:{},require:createRequire(import.meta.url),RankingChangeExplanation:componentContext.exports.default,ArrowRight:createRequire(import.meta.url)("lucide-react").ArrowRight});
vm.runInContext(compiled,context);
const modes=['all','random','bring','verified'];
function rows(preferences,ties){
 const total=preferences+ties;
 return [
  {id:'a',name:'Alpha',creator:'Fixture',rating:1500,sd:30,wins:preferences,losses:0,ties,comparisons:total,listeners:2},
  {id:'b',name:'Beta',creator:'Fixture',rating:1500,sd:30,wins:0,losses:preferences,ties,comparisons:total,listeners:2},
 ];
}
function cohort(offset){
 const categories=Object.fromEntries(modes.map((mode,i)=>[mode,{ie:rows(offset+i,2),oe:rows(offset+i+5,3)}]));
 return {...Object.fromEntries(modes.map(mode=>[mode,{rows:categories[mode].ie,voteCount:0,...(mode==='curated'?{trackCount:20}:{})}])),categories};
}
const research={...cohort(20),protocols:{current:cohort(1),legacy:cohort(10)}};
const plain=s=>s.replace(/<[^>]*>/g,'').replace(/&#x27;/g,"'").replace(/&amp;/g,'&');
let cases=0;
for(const protocol of ['all','current','legacy'])for(const type of ['ie','oe'])for(const mode of modes){
 const view=protocol==='all'?research:research.protocols[protocol];
 const markup=renderToStaticMarkup(context.exports.ranking({research,rankProtocol:protocol,rankMode:mode,rankType:type}));
 const expected=key=>view.categories[key][type][0].comparisons;
 const countPill=plain(markup.match(/<span class="count-pill">(.*?)<\/span>/s)?.[1]??'');
 assert.equal(countPill,`${expected(mode)} QUALIFIED COMPARISONS`,`${protocol}/${type}/${mode} main count includes ties`);
 const buttons=[...markup.matchAll(/<button[^>]*>(.*?)<\/button>/gs)].map(m=>plain(m[1]));
 assert.ok(!buttons.some(text=>/curated|original.*songs|selected songs/i.test(text)),'Historical 20-song filter is absent');
 assert.ok(buttons.includes(`Same file across listeners · ${expected('verified')} comparisons`),`${protocol}/${type}/${mode} same-file count`);
 assert.ok(!markup.includes('owner-curated tracks configured')&&!markup.includes('after 5 seconds per side count'));
 if(mode==='verified')assert.ok(markup.includes('re-encoding or changing embedded tags can change the hash'));
 cases++;
}
// A tie-only cohort must show one comparison, not zero wins or two target rows.
const one=cohort(0);one.categories.verified.ie=rows(0,1);
const singular=renderToStaticMarkup(context.exports.ranking({research:{...research,protocols:{...research.protocols,current:one}},rankProtocol:'current',rankMode:'verified',rankType:'ie'}));
assert.ok(singular.includes('1 QUALIFIED COMPARISON</span>'));
assert.ok(singular.includes('Same file across listeners · 1 comparison</button>'));
const loading=renderToStaticMarkup(context.exports.ranking({research:null,rankProtocol:'current',rankMode:'all',rankType:'oe'}));
assert.ok(loading.includes('0 QUALIFIED COMPARISONS'));
assert.ok(loading.includes('No votes meet this ranking'));
console.log(`Ranking view: ${cases} actual page renders verify protocol/headphone filters, main and same-file counters including ties; tie-only singular and loading states passed.`);

// Exercise the actual saved-view restoration branch for old curated selections.
const restore=page.match(/if \(localStorage\.getItem\("target-lab-ranking-layout-v2"\).*?setRankMode\(saved\.rankMode\); else setRankMode\("all"\);/s)?.[0];
assert.ok(restore);
for(const [savedMode,expected] of [['curated','all'],['verified','verified'],['random','random'],['bring','bring'],['all','all'],['unknown','all']]) {
 let restored;vm.runInNewContext(restore,{saved:{rankMode:savedMode},localStorage:{getItem:()=> 'true'},setRankMode:value=>{restored=value;}});assert.equal(restored,expected);
}
console.log('Removed historical view safely restores to All blind votes; valid saved views remain available.');

import {searchRows} from '../../../site/lib/search.ts';
import * as scoring from '../../../site/lib/preference-ranking.ts';
import {approvedEqModels} from '../../../site/data/approved-eq-models.ts';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import {renderToStaticMarkup} from 'react-dom/server';

const require=createRequire(import.meta.url);
function load(path, dependencies={}) {
 const exports={};
 const code=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInNewContext(code,{exports,require:id=>dependencies[id]??require(id)});
 return exports;
}
const eqRankings=load('site/lib/eq-rankings.ts',{'./preference-ranking':scoring,'../data/approved-eq-models':{approvedEqModels}});
const EqPresetRankings=load('site/components/eq-preset-rankings.tsx',{
 '@/lib/eq-rankings':eqRankings,
 '@/components/eq-preset-reactions':{default:()=>null},
}).default;
const preset=id=>({id,name:id});
const pair=(a,b,winsA,winsB,ties=0)=>({a,b,winsA,winsB,ties});
const models=[
 {id:'desktop',name:'Synthetic Headphone',type:'oe',presets:['Desk A','Desk B','Desk C'].map(preset),pairs:[pair('Desk A','Desk B',7,2,1)]},
 {id:'portable',name:'Synthetic IEM',type:'ie',presets:['IEM A','IEM B'].map(preset),pairs:[pair('IEM A','IEM B',0,0,4)]},
];

// Render the actual page fragment against deliberately different protocol and
// headphone cohorts. No database or participant records are used.
const page=readFileSync(new URL('../../../site/app/shootout/page.tsx',import.meta.url),'utf8');
const pageAst=ts.createSourceFile('page.tsx',page,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const rankingBranches=[];
function findRanking(node) {
 const expression = ts.isJsxExpression(node) && node.expression;
 if (expression && ts.isBinaryExpression(expression) &&
     expression.left.getText(pageAst) === 'tab === "rankings" && rankingsView !== "practice"' &&
     expression.right.getText(pageAst).includes('const view =')) {
  rankingBranches.push(expression.right.getText(pageAst));
 }
 ts.forEachChild(node, findRanking);
}
findRanking(pageAst);assert.equal(rankingBranches.length,1,'Find the actual ranking body rather than a navigation/eyebrow branch');
const expression=rankingBranches[0];
const source=`export function ranking({research,rankProtocol,rankMode,rankType,researchLoading=research===null,researchError="",rankQuery="",setRankMode=()=>{},setRankProtocol=()=>{}}) { const setRankQuery=()=>{},refresh=()=>{},setRankType=()=>{}; return (${expression}); }`;
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const componentContext=vm.createContext({exports:{},require:createRequire(import.meta.url)});vm.runInContext(ts.transpileModule(readFileSync("site/components/ranking-change-explanation.tsx","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,componentContext);
const context=vm.createContext({searchRows,targets:[],isCatalogAutoEqTarget:()=>true,exports:{},require,RankingChangeExplanation:componentContext.exports.default,rankingDeviceFilters:eqRankings.rankingDeviceFilters,EqPresetRankings:props=>EqPresetRankings({...props,models}),ArrowRight:require("lucide-react").ArrowRight});
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
 return {...Object.fromEntries(modes.map((mode,i)=>[mode,{rows:rows(offset+i+14,5),voteCount:0}])),categories};
}
const research={...cohort(20),freeListening:cohort(30),protocols:{current:cohort(1),legacy:cohort(10)}};
const plain=s=>s.replace(/<[^>]*>/g,'').replace(/&#x27;/g,"'").replace(/&amp;/g,'&');
let cases=0;
for(const protocol of ['all','current','legacy','free'])for(const type of ['all','ie','oe'])for(const mode of modes){
 const view=protocol==='free'?research.freeListening:protocol==='all'?research:research.protocols[protocol];
 const markup=renderToStaticMarkup(context.exports.ranking({research,rankProtocol:protocol,rankMode:mode,rankType:type}));
 const expected=key=>(type==='all'?view[key].rows:view.categories[key][type])[0].comparisons;
 const countPill=plain(markup.match(/<span class="count-pill"[^>]*>(.*?)<\/span>/s)?.[1]??'');
 assert.equal(countPill,`${expected(mode)} QUALIFIED COMPARISONS`,`${protocol}/${type}/${mode} main count includes ties`);
 const buttons=[...markup.matchAll(/<button[^>]*>(.*?)<\/button>/gs)].map(m=>plain(m[1]));
 assert.ok(!buttons.some(text=>/curated|original.*songs|selected songs/i.test(text)),'Historical 20-song filter is absent');
 assert.ok(buttons.includes(`Same file across listeners · ${expected('verified')} comparisons`),`${protocol}/${type}/${mode} same-file count`);
 assert.ok(!markup.includes('owner-curated tracks configured')&&!markup.includes('after 5 seconds per side count'));
 assert.ok(markup.includes('Target leaderboard')&&markup.includes('EQ preset rankings'));
 assert.equal(markup.includes('Synthetic Headphone'),type!=='ie');
 assert.equal(markup.includes('Synthetic IEM'),type!=='oe');
 assert.ok(markup.includes(`aria-pressed="true">${{all:'All',oe:'Headphones',ie:'IEMs'}[type]}</button>`));
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
assert.ok(loading.includes('Loading research results'));
console.log(`Ranking view: ${cases} actual page renders verify protocol/headphone filters, main and same-file counters including ties; tie-only singular and loading states passed.`);

// Exercise the actual saved-view restoration branch for old curated selections.
const restore=page.match(/if \(localStorage\.getItem\("target-lab-ranking-layout-v2"\).*?setRankMode\(saved\.rankMode\); else setRankMode\("all"\);/s)?.[0];
assert.ok(restore);
for(const [savedMode,expected] of [['curated','all'],['verified','verified'],['random','random'],['bring','bring'],['all','all'],['unknown','all']]) {
 let restored;vm.runInNewContext(restore,{saved:{rankMode:savedMode},localStorage:{getItem:()=> 'true'},setRankMode:value=>{restored=value;}});assert.equal(restored,expected);
}
console.log('Removed historical view safely restores to All blind votes; valid saved views remain available.');

// The All results default uses the same pooled order as the Android catalog.
assert.match(page,/const \[rankProtocol,setRankProtocol\]=useState<[^>]+>\("all"\)/);
const withEarlier = {
 ...research,
 all: {rows: rows(7, 0).reverse(), voteCount: 7},
 protocols:{...research.protocols,legacy:{...cohort(40),all:{rows:rows(2,0),voteCount:2}}},
};
const defaults = {research: withEarlier, rankProtocol: 'all', rankMode: 'all', rankType: 'all'};
const changes = [];
const setters = {
 setRankProtocol: protocol => changes.push(protocol),
 setRankMode: mode => changes.push(mode),
};
function findPressedButtons(node) {
 if (Array.isArray(node)) return node.flatMap(findPressedButtons);
 if (node?.type === 'button' && typeof node.props['aria-pressed'] === 'boolean') return [node.props];
 return node?.props ? findPressedButtons(node.props.children) : [];
}
const findShortcut = (props, label) => findPressedButtons(context.exports.ranking({...props, ...setters}))
 .find(button => button.children === label);

const defaultMarkup = renderToStaticMarkup(context.exports.ranking(defaults));
assert.ok(defaultMarkup.includes('7 QUALIFIED COMPARISONS'));
assert.ok(defaultMarkup.indexOf('<strong>Beta</strong>') < defaultMarkup.indexOf('<strong>Alpha</strong>'));
assert.ok(!defaultMarkup.includes('id="ranking-fitter"'));
assert.equal(findShortcut(defaults, 'All results')['aria-pressed'], true);
const earlierLabel = 'Earlier results';
const earlierButton = findShortcut(defaults, earlierLabel);
assert.equal(earlierButton['aria-pressed'], false);
earlierButton.onClick();
assert.deepEqual(changes.splice(0), ['legacy', 'all']);
const earlier = {...defaults, rankProtocol: 'legacy'};
assert.equal(findShortcut(earlier, earlierLabel)['aria-pressed'], true);
assert.ok(renderToStaticMarkup(context.exports.ranking(earlier)).includes('2 QUALIFIED COMPARISONS'));
findShortcut(earlier, 'Matched A/B').onClick();
assert.deepEqual(changes.splice(0), ['current', 'all']);
findShortcut(earlier, 'All results').onClick();
assert.deepEqual(changes, ['all', 'all']);
assert.equal(findShortcut({...defaults, research}, earlierLabel), undefined);
console.log('All results preserves API order; the visible shortcuts select combined, matched, and earlier evidence.');

const failed=renderToStaticMarkup(context.exports.ranking({research:null,rankProtocol:'current',rankMode:'all',rankType:'oe',researchLoading:false,researchError:'Synthetic unavailable'}));assert.ok(failed.includes('Synthetic unavailable')&&failed.includes('Try again')&&!failed.includes('No comparisons match'),'Failed reads never pretend research is empty');

const [headphone,iem]=eqRankings.eqRankingsForDevice(models,'all');
assert.deepEqual(Array.from(headphone.ranked,row=>[row.name,row.rank]),[['Desk A',1],['Desk B',2]]);
assert.deepEqual(Array.from(iem.ranked,row=>row.rank),[1,1],'Model ranks start independently and exact ties share rank');
assert.deepEqual(Array.from(headphone.awaiting,row=>row.name),['Desk C']);
const published = renderToStaticMarkup(EqPresetRankings({device:'all'}));
assert.ok(published.includes('Awaiting comparisons') && published.includes('Arya Stealth Personal EQ v3') && published.includes('by trudenpa'));
assert.ok(!published.includes('Synthetic Headphone') && !published.includes('Synthetic IEM'),'Synthetic comparisons stay out of the shipped catalog');
const disconnected={...models[0],presets:[...models[0].presets,preset('Desk D')],pairs:[...models[0].pairs,pair('Desk C','Desk D',3,0)]};
assert.equal(eqRankings.eqRankingsForDevice([disconnected],'all')[0].needsConnection,true);
assert.throws(()=>eqRankings.eqRankingsForDevice([{...models[0],pairs:[pair('Desk A','IEM B',5,0)]}],'all'),/Invalid published comparison/);
assert.throws(()=>eqRankings.eqRankingsForDevice([{...models[0],pairs:[...models[0].pairs,pair('Desk B','Desk A',2,7,1)]}],'all'),/Invalid published comparison/);
console.log('EQ rankings preserve independent model orders, ties and awaiting entries, with cross-model and duplicate comparisons rejected.');

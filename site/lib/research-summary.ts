/** Private, live planning summaries. These are NOT anonymous archive releases. */
export type ResearchObservation = { winner_id:string; loser_id:string; winner_name:string; loser_name:string; created_at:number; test_mode:string; headphone_type:string|null; group_id:string; group_kind:string };
export type ResearchSummaryRow = { year:number; mode:string; headphoneType:string; targetA:string; targetB:string; nameA:string; nameB:string; comparisons:number; aWins:number; bWins:number; groups:number; verifiedAccountGroups:number; legacyBrowserGroups:number; sharedAdminGroups:number; repeatComparisons:number; rawAShare:number; equalGroupAShare:number };
export function summarizeResearch(rows:ResearchObservation[]) {
  const cells=new Map<string,{row:ResearchSummaryRow;groups:Map<string,{a:number;n:number;kind:string}>}>();
  for(const vote of rows){
    if(vote.winner_id===vote.loser_id||!Number.isFinite(vote.created_at))continue;
    const [a,b]=[vote.winner_id,vote.loser_id].sort(),year=new Date(vote.created_at).getUTCFullYear(),mode=vote.test_mode,headphoneType=vote.headphone_type||"unspecified";
    const key=JSON.stringify([year,mode,headphoneType,a,b]);
    let cell=cells.get(key);
    if(!cell){cell={row:{year,mode,headphoneType,targetA:a,targetB:b,nameA:vote.winner_id===a?vote.winner_name:vote.loser_name,nameB:vote.winner_id===b?vote.winner_name:vote.loser_name,comparisons:0,aWins:0,bWins:0,groups:0,verifiedAccountGroups:0,legacyBrowserGroups:0,sharedAdminGroups:0,repeatComparisons:0,rawAShare:0,equalGroupAShare:0},groups:new Map()};cells.set(key,cell);}
    const wonA=vote.winner_id===a;
    cell.row.comparisons++;if(wonA)cell.row.aWins++;else cell.row.bWins++;
    const group=cell.groups.get(vote.group_id)||{a:0,n:0,kind:vote.group_kind};group.n++;if(wonA)group.a++;cell.groups.set(vote.group_id,group);
  }
  return [...cells.values()].map(({row,groups})=>{
    row.groups=groups.size;row.repeatComparisons=row.comparisons-groups.size;row.rawAShare=row.aWins/row.comparisons;
    row.equalGroupAShare=[...groups.values()].reduce((n,g)=>n+g.a/g.n,0)/groups.size;
    for(const g of groups.values()){if(g.kind==="account")row.verifiedAccountGroups++;else if(g.kind==="shared-admin")row.sharedAdminGroups++;else row.legacyBrowserGroups++;}
    return row;
  }).sort((a,b)=>b.year-a.year||a.nameA.localeCompare(b.nameA)||a.nameB.localeCompare(b.nameB)||a.mode.localeCompare(b.mode)||a.headphoneType.localeCompare(b.headphoneType));
}

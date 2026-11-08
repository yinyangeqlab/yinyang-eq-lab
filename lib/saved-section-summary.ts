export function savedSectionName(key: string): string { return key.replace(/^target-lab-/, "").replaceAll("-", " "); }
export function savedSectionSummary(raw: string | undefined): { description: string; entries: string[] } {
  if (raw === undefined) return {description:"No copy in this location.",entries:[]};
  try { const value: unknown=JSON.parse(raw); const rows=Array.isArray(value)?value:value&&typeof value==="object"?Object.values(value):[value];
    const entries=rows.slice(0,8).map((row:unknown,index:number)=>{if(row&&typeof row==="object"){const item=row as Record<string,unknown>;const label=[item.name,item.title,item.device,item.targetName].find(v=>typeof v==="string"&&v.trim());return typeof label==="string"?label.slice(0,160):`Saved entry ${index+1}`;}return typeof row==="string"?row.slice(0,160):`Saved value ${index+1}`;});
    return {description:`${rows.length} ${rows.length===1?"entry":"entries"} in this section. ${rows.length>8?"First 8 shown.":""}`,entries};
  } catch { return {description:"Saved value could not be summarized. Review technical details before deciding.",entries:[]}; }
}

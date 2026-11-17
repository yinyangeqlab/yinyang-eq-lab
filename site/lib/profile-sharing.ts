export const PROFILE_CATEGORIES = [
  {id:'comparisons',label:'Comparison results',kinds:['vote','run','open']},
  {id:'personal',label:'Personal research comparisons',kinds:['personal']},
  {id:'descriptions',label:'Listening descriptions',kinds:['feedback']},
  {id:'measurements',label:'Contributed measurements',kinds:['measurement']},
  {id:'exports',label:'Saved EQ exports',kinds:['export']},
  {id:'targets',label:'Contributed targets',kinds:['target']},
  {id:'ratings',label:'Current song ratings',kinds:['music']},
  {id:'suggestions',label:'Song suggestions',kinds:['suggestion']},
  {id:'journal',label:'Personal and song activity journal',kinds:['history']},
] as const;
export type ProfileCategory = typeof PROFILE_CATEGORIES[number]['id'];
export const PROFILE_SHARE_BATCH = 25;

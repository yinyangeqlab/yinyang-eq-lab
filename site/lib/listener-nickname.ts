// A nickname labels an authenticated account; it never grants a brand identity or privileges.
export const NICKNAME_BRAND_RULE = "The YinYangEQ brand name and lookalikes are reserved. Do not use Yin Yang, Ying Yang EQ, Yin Yang EQ Labs, Yin Yang Labs or similar names as your nickname.";
export const NICKNAME_BRAND_FLAG = "Nickname flagged: this name contains or closely resembles the reserved YinYangEQ brand. No one may use the brand name as a site nickname. Choose another name, or contact the admin/owner for permission or if you believe this is an error.";
const invalidNickname = "Use a nickname of up to 40 characters, without email addresses or control characters.";
const lookalikes: Record<string,string> = {
  "а":"a","α":"a","ɑ":"a","ᴀ":"a","і":"i","ι":"i","ı":"i","ɪ":"i","ⅼ":"l","ɡ":"g","ց":"g",
  "у":"y","ү":"y","ʏ":"y","ɣ":"y","п":"n","ɴ":"n","η":"n","ԛ":"q","е":"e","ε":"e",
  "1":"i","!":"i","|":"i","3":"e","4":"a","@":"a","7":"t","0":"o","5":"s","$":"s",
};
function closeBrand(candidate:string, brand:string) {
  if (Math.abs(candidate.length-brand.length)>1) return false;
  // One insertion, deletion, substitution or adjacent transposition is suspicious.
  if(candidate.length===brand.length){const diff=[];for(let i=0;i<brand.length;i++)if(candidate[i]!==brand[i])diff.push(i);return diff.length<=1||diff.length===2&&diff[1]===diff[0]+1&&candidate[diff[0]]===brand[diff[1]]&&candidate[diff[1]]===brand[diff[0]];}
  const longer=candidate.length>brand.length?candidate:brand,shorter=candidate.length>brand.length?brand:candidate;
  let left=0,right=0,skipped=false;
  while(left<longer.length&&right<shorter.length){if(longer[left]===shorter[right]){left++;right++;}else{if(skipped)return false;skipped=true;left++;}}
  return true;
}
export function isReservedListenerNickname(value:unknown):boolean {
  if(typeof value!=="string")return false;
  const folded=Array.from(value.slice(0,240).normalize("NFKD").toLowerCase().replace(/[\p{M}\p{Cf}]/gu,"")).map(char=>lookalikes[char]||char).join("");
  const words=folded.match(/[a-z]+/g)||[],compact=words.join("");
  const brands=["yinyang","yingyang"];
  if(brands.some(brand=>compact.includes(brand))||/ying?andyang/.test(compact))return true;
  const candidates=[compact];
  for(let start=0;start<words.length;start++)for(let count=1;count<=4&&start+count<=words.length;count++)candidates.push(words.slice(start,start+count).join(""));
  // Look inside a decorated handle when it also claims EQ/lab/official branding.
  if(/eq|labs?|official/.test(compact))for(let start=0;start<compact.length;start++)for(let length=6;length<=9;length++)candidates.push(compact.slice(start,start+length));
  return candidates.some(candidate=>brands.some(brand=>closeBrand(candidate,brand)));
}
export function listenerNicknameError(value:unknown):string|null {
  if(isReservedListenerNickname(value))return NICKNAME_BRAND_FLAG;
  if(typeof value!=="string"||/[\p{Cc}\p{Cf}]/u.test(value))return invalidNickname;
  const nickname=value.normalize("NFC").trim().replace(/\s+/g," ");
  return Array.from(nickname).length>40||nickname.includes("@")?invalidNickname:null;
}
export function normalizeListenerNickname(value:unknown):string|null {
  if(listenerNicknameError(value))return null;
  return (value as string).normalize("NFC").trim().replace(/\s+/g," ");
}

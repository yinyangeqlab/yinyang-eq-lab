export const PERSONAL_MUSIC_TOKENS_KEY="target-lab-personal-music-tokens-v1";
/** Research receives only an unrelated random ID. Fingerprints may be copied by separately consented private account sync, never with audio bytes. */
export function personalMusicToken(storage:Pick<Storage,"getItem"|"setItem">, fingerprint:string, uuid=()=>crypto.randomUUID()) {
  if(!/^[a-f0-9]{64}$/i.test(fingerprint))throw Error("Wait for the local music fingerprint before choosing.");
  const tokens=JSON.parse(storage.getItem(PERSONAL_MUSIC_TOKENS_KEY)||"{}");
  if(!tokens||typeof tokens!=="object"||Array.isArray(tokens)||Object.keys(tokens).length>200||Object.entries(tokens).some(([key,value])=>!/^[a-f0-9]{64}$/i.test(key)||typeof value!=="string"||!/^[a-f0-9-]{36}$/i.test(value)))throw Error("Personal recording references could not be read.");
  if(!tokens[fingerprint]){if(Object.keys(tokens).length>=200)throw Error("Personal recording-reference storage is full. This answer remains local.");tokens[fingerprint]=uuid();storage.setItem(PERSONAL_MUSIC_TOKENS_KEY,JSON.stringify(tokens));}
  return `own:${tokens[fingerprint]}`;
}

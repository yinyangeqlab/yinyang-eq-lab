/** Status describes confirmed collection, never promises an unimplemented public score. */
export type PersonalSharingState = {
  enabled:boolean;
  token:string|null;
  state?:"checking"|"ready"|"unavailable";
  testOnly?:boolean;
  ownerProfile?:boolean;
};
export function personalContributionStatus(sharing:PersonalSharingState, options:{testOnly?:boolean|null;practice?:boolean;sample?:boolean}={}) {
  if(options.sample)return {kind:"sample",text:"Simulated results · your saved tournament is unchanged."} as const;
  if(options.testOnly||sharing.testOnly)return {kind:"test",text:"Private Test Mode · test choices stay on this device and do not contribute to research or community rankings."} as const;
  if(options.practice)return {kind:"practice",text:"Practice · choices are not saved or contributed."} as const;
  if(sharing.state==="unavailable")return {kind:"unavailable",text:"Private research sharing could not be verified. This option will not send choices until its setting is checked. Community Preferences has a separate setting."} as const;
  if(sharing.state!=="ready")return {kind:"checking",text:"Checking private research sharing…"} as const;
  if(sharing.enabled&&!sharing.token)return {kind:"unavailable",text:"Private research sharing could not be verified. This option will not send choices until its setting is checked. Community Preferences has a separate setting."} as const;
  if(sharing.enabled&&sharing.token)return {kind:"on",text:"Private research sharing is on · future choices contribute to admin-only project research. Your personal progress is also saved in this browser."} as const;
  return {kind:"off",text:sharing.ownerProfile?"Private research sharing is off · local progress and the private account journal remain available. Community Preferences has a separate setting.":"Private research sharing is off · local progress remains saved. Community Preferences, Sync and export have separate controls."} as const;
}

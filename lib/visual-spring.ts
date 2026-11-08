/** Bounded, time-based motion for a decorative glow; never touches audio. */
export function visualSpring(level:number,velocity:number,target:number,elapsed:number) {
  let remaining=Math.max(0,Math.min(.1,elapsed));
  const goal=Math.max(0,Math.min(1,target));
  while(remaining>0){
    const step=Math.min(remaining,1/120);
    velocity+=((goal-level)*90-velocity*11)*step;
    level+=velocity*step;remaining-=step;
  }
  return {level:Math.max(0,Math.min(1.2,level)),velocity};
}

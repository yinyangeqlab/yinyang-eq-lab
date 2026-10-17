import type { Point } from './curves';

export type Match = { id: string; name: string; kind: 'duplicate curve' | 'similar curve' | 'same name'; rms: number | null };
export function compareTargets(name: string, points: Point[], targets: { id: string; name: string; points: Point[] }[]): Match[] {
  const at = (curve: Point[], hz: number) => {
    for (let i=1; i<curve.length; i++) if (curve[i][0]>=hz) {
      const [x0,y0]=curve[i-1], [x1,y1]=curve[i];
      return y0+(y1-y0)*Math.log(hz/x0)/Math.log(x1/x0);
    }
    return curve[curve.length-1][1];
  };
  const normalized = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g,'');
  const matches: Match[] = [];
  for (const target of targets) {
    const low=Math.max(points[0][0],target.points[0][0]);
    const high=Math.min(points[points.length-1][0],target.points[target.points.length-1][0]);
    let rms: number | null=null;
    if(high/low>=100) {
      const differences=Array.from({length:41},(_,i)=>at(points,low*(high/low)**(i/40))-at(target.points,low*(high/low)**(i/40)));
      const mean=differences.reduce((a,b)=>a+b,0)/differences.length;
      rms=Math.sqrt(differences.reduce((n,x)=>n+(x-mean)**2,0)/differences.length);
    }
    const kind=rms!==null&&rms<=.08?'duplicate curve':rms!==null&&rms<=.75?'similar curve':normalized(name)===normalized(target.name)?'same name':null;
    if(kind)matches.push({id:target.id,name:target.name,kind,rms:rms===null?null:+rms.toFixed(2)});
  }
  return matches;
}

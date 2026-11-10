/** Decorative image-space motion. It never reads audio or changes playback. */
const pulseSeconds = 8.5;
const pulseDelaySeconds = 3.5;
export const LANDSCAPE_CYCLE_SECONDS = pulseSeconds + pulseDelaySeconds;
export const LANDSCAPE_ORB = { x: .5, y: .289, radius: .197 } as const;
/** The drawn orb floats vertically around a point above the one baked into the artwork. */
export const LANDSCAPE_ORB_REST_OFFSET = -.022;
const orbFloat = .021;
/** Drawn orb radius as a fraction of LANDSCAPE_ORB.radius. */
export const LANDSCAPE_ORB_DRAWN_SCALE = .9;
const rhythmChangeSeconds = 3 * LANDSCAPE_CYCLE_SECONDS;
// Eighth-note strengths. Each phrase divides the 48-step scene cycle.
// The final slot is quiet so a new pattern can enter at the wave downbeat.
const rhythmPatterns = [
  [.72, 0, .34, 0, .56, 0, .32, 0], // Straight 4/4
  [.69, 0, .25, 0, .31, 0], // 3/4
  [.58, .27, 0, .48, .44, .29, .11, 0], // Reggae-inspired offbeats
  [.62, 0, 0, .38, 0, .53, 0, 0, .57, 0, .42, 0, 0, .34, .26, 0], // Bossa-inspired syncopation
  [.72, 0, 0, .36, .27, 0, 0, .27, .66, 0, .21, 0, .35, .32, .48, 0], // Double taps
] as const;

const VERTEX = `
attribute vec2 position;
varying vec2 screenUv;
void main(){screenUv=vec2(position.x*.5+.5,.5-position.y*.5);gl_Position=vec4(position,0.,1.);}
`;
const FRAGMENT = `
precision highp float;
uniform sampler2D artwork;
uniform vec2 imageSize;
uniform vec2 viewSize;
uniform float time;
uniform vec4 rhythmStrengths[4];
uniform float rhythmLength;
varying vec2 screenUv;
const float PERIOD=${pulseSeconds};
const float PULSE_GAP=${pulseDelaySeconds};
const float TAU=6.2831853;
float sat(vec3 c){return smoothstep(.10,.30,max(c.r,c.b)-min(c.r,c.b))*smoothstep(.25,.5,max(c.r,c.b));}
float tapStrength(float slot){
 if(mod(slot,48.)==0.) return .18;
 float stepIndex=mod(slot,rhythmLength);
 vec4 lanes=vec4(0.,1.,2.,3.);
 return .102*(
  dot(rhythmStrengths[0],max(vec4(0.),1.-abs(stepIndex-lanes)))+
  dot(rhythmStrengths[1],max(vec4(0.),1.-abs(stepIndex-lanes-4.)))+
  dot(rhythmStrengths[2],max(vec4(0.),1.-abs(stepIndex-lanes-8.)))+
  dot(rhythmStrengths[3],max(vec4(0.),1.-abs(stepIndex-lanes-12.)))
 );
}
float coneTap(float age){
 float press=smoothstep(0.,.09,age)*(1.-smoothstep(.09,.22,age));
 float rebound=smoothstep(.15,.23,age)*(1.-smoothstep(.23,.32,age));
 return press-.30*rebound;
}
float pressureShear(float age,float distance){
 float travel=clamp(age/.44,0.,1.);
 float offset=(distance-mix(1.025,1.43,travel))/mix(.095,.18,travel);
 float envelope=smoothstep(0.,.06,age)*(1.-smoothstep(.19,.44,age));
 return offset*exp(-offset*offset)*envelope;
}
float cloudNoise(vec2 point){
 vec2 cell=floor(point);
 vec2 blend=fract(point);
 blend=blend*blend*(3.-2.*blend);
 // Hash shared corners from the same coordinates so adjacent cells meet smoothly.
 vec4 cornerX=cell.x+vec4(0.,1.,0.,1.);
 vec4 cornerY=cell.y+vec4(0.,0.,1.,1.);
 vec4 corners=fract((127.1*cornerX+311.7*cornerY)*.1031);
 corners=fract(2.*corners*corners*(corners+33.33));
 return mix(mix(corners.x,corners.y,blend.x),mix(corners.z,corners.w,blend.x),blend.y);
}
// A soft volume with enough falloff to leave gaps between mist pockets.
float mistVolume(vec2 point,vec2 center,vec2 extent){
 vec2 offset=(point-center)/extent;
 float distance=dot(offset,offset);
 return exp(-1.6*distance)*(1.-smoothstep(1.15,2.55,distance));
}
// Four upright, meandering sheets viewed along ground-level sightlines.
const int AURORA_HEIGHT_STEPS=7;
const float AURORA_BASE_HEIGHT=.90;
const float AURORA_HEIGHT_STEP=.25;
float auroraMeander(float x,vec4 wave,float phase){
 // wave is amplitude, spatial frequency, cycles per loop and phase offset.
 return wave.x*(sin(wave.y*x-wave.z*phase+wave.w)+.45*sin(1.83*wave.y*x+wave.z*phase+2.3*wave.w));
}
vec3 auroraBand(vec2 ground,vec4 sheet,vec4 wave,vec4 patches,vec2 span,float tint,float gain,float phase){
 // sheet is ground offset, slope, thickness and emission scale height.
 // patches is spatial frequency, cycles per loop, phase offset and light floor.
 float groundLength=length(ground), intensity=0., weightedHeight=0.;
 float lower=(ground.y*AURORA_BASE_HEIGHT-sheet.x-sheet.y*ground.x*AURORA_BASE_HEIGHT
   -auroraMeander(ground.x*AURORA_BASE_HEIGHT,wave,phase))/sheet.z;
 for(int index=0;index<AURORA_HEIGHT_STEPS;index++){
  float lowHeight=AURORA_BASE_HEIGHT+AURORA_HEIGHT_STEP*float(index);
  float highHeight=lowHeight+AURORA_HEIGHT_STEP;
  float upper=(ground.y*highHeight-sheet.x-sheet.y*ground.x*highHeight
   -auroraMeander(ground.x*highHeight,wave,phase))/sheet.z;
  float distanceChange=upper-lower, middle=.5*(lower+upper);
  float softness=inversesqrt(1.+middle*middle);
  float lowerFalloff=inversesqrt(1.+lower*lower);
  float upperFalloff=inversesqrt(1.+upper*upper);
  // Integrate the soft cross-section so a folded edge stays continuous.
  float density=(abs(upper*upperFalloff-lower*lowerFalloff)
   +.15*softness*softness*softness)/(abs(distanceChange)+.15);
  // The density centroid stays continuous even when the ray grazes a sheet.
  float fraction=upperFalloff/(lowerFalloff+upperFalloff);
  float height=lowHeight+AURORA_HEIGHT_STEP*fraction;
  float x=ground.x*height;
  float profile=smoothstep(.90,1.15,height)*exp(-(height-1.)/sheet.w);
  float glow=mix(patches.w,1.,.5+.5*sin(patches.x*x-patches.y*phase+patches.z))
   *smoothstep(span.x,span.x+1.2,x)*(1.-smoothstep(span.y-1.2,span.y,x))
   *exp(-groundLength*height/16.);
  float light=profile*glow*density*groundLength*AURORA_HEIGHT_STEP/sheet.z;
  intensity+=light;
  weightedHeight+=light*height;
  lower=upper;
 }
 float meanHeight=weightedHeight/max(intensity,.0001);
 // Color drifts along each sheet, with warmer accents high in the folds.
 float hue=.5+.5*sin(.76*ground.x*meanHeight-phase+.7*patches.z);
 vec3 green=mix(vec3(.23,1.,.44),vec3(.12,.96,.70),.69*hue);
 vec3 blue=mix(vec3(.10,.71,.97),vec3(.27,.52,.98),hue);
 vec3 violet=mix(vec3(.36,.35,1.),vec3(.92,.35,.64),smoothstep(.36,.93,hue));
 vec3 color=mix(green,blue,smoothstep(1.01,1.75,meanHeight+.37*tint));
 color=mix(color,violet,.84*smoothstep(1.17,1.93,meanHeight+.44*tint));
 return color*(1.-exp(-gain*intensity));
}
vec3 equinoxAurora(vec2 uv,float phase){
 // Tilt the view upward and align its horizon with the landscape plate.
 vec2 camera=vec2((uv.x-.5)*2.22,(.104-uv.y)*1.2);
 vec3 ray=vec3(camera.x,camera.y*.9063+.4226,.9063-camera.y*.4226);
 float elevation=ray.y*inversesqrt(dot(ray,ray));
 if(elevation<.004) return vec3(0.);
 vec2 ground=ray.xz/ray.y;
 vec3 light=
   auroraBand(ground,vec4(2.,.80,.26,.70),vec4(.33,1.78,1.,.6),vec4(.55,1.,1.,.45),vec2(-1.5,7.),.19,.8,phase)
  +auroraBand(ground,vec4(4.6,.65,.40,.60),vec4(.85,1.43,1.,2.1),vec4(.70,1.,3.2,.35),vec2(-9.,9.),.04,.9,phase)
  +auroraBand(ground,vec4(9.5,.45,.75,.40),vec4(1.43,1.04,-1.,4.),vec4(.45,-1.,.4,.30),vec2(-12.,14.),-.10,1.3,phase)
  +auroraBand(ground,vec4(3.2,.70,.30,.80),vec4(.28,1.88,1.,5.2),vec4(.90,1.,2.,.20),vec2(-5.,.2),.59,.45,phase);
 return 1.-exp(-1.15*light*smoothstep(0.,.08,elevation));
}
float ridgeSkyHeight(float x){
 // Left and right skyline heights sampled across the source artwork.
 float outward=min(abs(x-.5)*20.,9.9999);
 float part=fract(outward);
 vec2 heights=vec2(.493);
 if(outward>=9.) heights=mix(vec2(.307,.280),vec2(.323),part);
 else if(outward>=8.) heights=mix(vec2(.327,.338),vec2(.307,.280),part);
 else if(outward>=7.) heights=mix(vec2(.360,.365),vec2(.327,.338),part);
 else if(outward>=6.) heights=mix(vec2(.385,.373),vec2(.360,.365),part);
 else if(outward>=5.) heights=mix(vec2(.405,.398),vec2(.385,.373),part);
 else if(outward>=4.) heights=mix(vec2(.470,.438),vec2(.405,.398),part);
 else if(outward>=3.) heights=mix(vec2(.493,.476),vec2(.470,.438),part);
 else if(outward>=2.) heights=mix(vec2(.493),vec2(.493,.476),part);
 float leftPeak=(x-.082)/.013, rightPeak=(x-.956)/.011;
 return mix(heights.x,heights.y,step(.5,x))-.043*exp(-leftPeak*leftPeak)-.015*exp(-rightPeak*rightPeak);
}
float waterArrival(vec2 point,float horizon){
 // Invert the same widening crest that deforms the ocean below.
 float across=point.x-.5;
 float distance=(point.y-horizon)/(1.-horizon)+.52*across*across;
 return PERIOD*(.09+.78*pow(clamp(distance/.97,0.,1.),2./3.));
}
vec3 waterAccent(vec2 uv,vec2 center,vec2 width,vec3 tint,float age,float rhythm){
 vec2 offset=(uv-center)/width;
 float answer=smoothstep(0.,.24,age)*(1.-smoothstep(.24,1.44,age));
 float quiet=.027+.018*sin(rhythm);
 return tint*(.42*answer+quiet)*exp(-dot(offset,offset));
}
float nightStars(vec2 uv){
 vec2 field=uv*vec2(124.,67.);
 vec2 cell=floor(field);
 vec3 seed=fract(sin(vec3(dot(cell,vec2(127.1,311.7)),dot(cell,vec2(269.5,183.3)),
   dot(cell,vec2(419.2,371.9))))*43758.5453);
 vec2 offset=.16+.68*seed.xy;
 float distance=length(fract(field)-offset);
 return step(.92,seed.z)*(1.-smoothstep(.02,.102,distance))*(.13+.22*seed.x);
}
void main(){
 float aspect=imageSize.x/imageSize.y, viewport=viewSize.x/viewSize.y;
 vec2 span=viewport>aspect?vec2(1.,aspect/viewport):vec2(viewport/aspect,1.);
 vec2 uv=screenUv*span+vec2((1.-span.x)*.5,(1.-span.y)*.25);
 // Clear the baked orb at plate. The drawn orb floats along the centre line.
 vec2 plate=vec2(${LANDSCAPE_ORB.x},${LANDSCAPE_ORB.y});
 float radius=${LANDSCAPE_ORB.radius};
 float cycle=mod(time,PERIOD+PULSE_GAP);
 float turn=cycle*TAU/(PERIOD+PULSE_GAP);
 // The lowest point of the float coincides with the start of the wave.
 float hover=sin(turn-.262);
 vec2 moon=plate+vec2(0.,(${LANDSCAPE_ORB_REST_OFFSET})+${orbFloat}*hover);
 float waveAge=cycle-PULSE_GAP;
 float orbPress=smoothstep(0.,.065,waveAge)*(1.-smoothstep(.065,.21,waveAge));
 /* Keep the strongest thump on the wave launch, with softer taps between waves. */
 float beat=(cycle-PULSE_GAP)*4.;
 float slot=floor(beat), age=fract(beat)*.25;
 float currentTap=tapStrength(slot), previousTap=tapStrength(slot-1.);
 float stroke=currentTap*coneTap(age)+previousTap*coneTap(age+.25);
 vec2 imageLocal=(uv-moon)*vec2(aspect,1.)/radius;
 float imageDistance=length(imageLocal);
 vec2 local=imageLocal/(${LANDSCAPE_ORB_DRAWN_SCALE}*(1.+.15*stroke*(1.-orbPress)-.014*orbPress));
 float dd=length(local);
 // The lower silhouette softens in the horizon haze.
 float edgeFeather=mix(.009,.035,smoothstep(-.12,.90,local.y));
 float disc=1.-smoothstep(1.-edgeFeather,1.003,dd), outside=1.-disc;
 float horizon=.493;
 float water=smoothstep(horizon-.004,horizon+.04,uv.y);           /* explicit, disc-independent */
 float depth=smoothstep(horizon,1.,uv.y);
 /* A broad ripple leaves the disc, softens as it spreads, then rests between passes. */
 float phase=clamp(waveAge/PERIOD,0.,1.);
 float front=radius+phase*(aspect*.58+.23);
 float dm=length((uv-moon)*vec2(aspect,1.));
 float s=(dm-front)/mix(.045,.135,phase);
 float shell=exp(-s*s)*smoothstep(0.,.07,phase)*(1.-smoothstep(.74,1.,phase));
 float lens=shell*s*2.;
 vec2 radial=((uv-moon)*vec2(aspect,1.))/max(dm,.0001)/vec2(aspect,1.);
 /* Each tap bends nearby air. The original wave carries the longer refraction. */
 float pressure=currentTap*pressureShear(age,imageDistance)+previousTap*pressureShear(age+.25,imageDistance);
 float refraction=(lens*.021+pressure*.17)*outside;
 vec2 warped=uv-radial*refraction*(1.-water);
 /* The bright mountain traces vibrate vertically and respond to the passing ring. */
 vec3 original=texture2D(artwork,uv).rgb;
 float mountainSide=abs(uv.x-.5);
 // The outer foothills sit below the central waterline in the source artwork.
 float ridgeFoot=horizon+mix(.018,.155,smoothstep(.12,.37,mountainSide));
 float ridge=sat(original)*smoothstep(horizon-.29,horizon-.15,uv.y)
   *(1.-smoothstep(ridgeFoot-.035,ridgeFoot,uv.y))*smoothstep(.10,.24,mountainSide)*outside;
 float drift=abs(uv.x-.5)*18.+uv.y*8.;
 float brightness=max(original.r,max(original.g,original.b));
 float trace=ridge*smoothstep(.40,.76,brightness);
 float ridgeRoll=sin((dm-front)*37.-uv.y*12.);
 float vibration=sin(drift*2.9-7.*turn)+.30*sin(drift*4.6-11.*turn);
 float summitHeight=mix(.507,.322,smoothstep(.08,.44,mountainSide));
 float summit=trace*(1.-smoothstep(summitHeight+.014,summitHeight+.051,uv.y));
 float crestPhase=mountainSide*43.+uv.y*9.-5.*turn+1.2*step(.5,uv.x);
 float crestLight=smoothstep(.37,.96,.5+.5*sin(crestPhase));
 vec3 aboveRidge=texture2D(artwork,uv-vec2(0.,.025)).rgb;
 float skyBehindTip=1.-smoothstep(.17,.40,max(aboveRidge.r,max(aboveRidge.g,aboveRidge.b)));
 float ringAge=waveAge-PERIOD*(dm-radius)/(aspect*.58+.23);
 float ringEnvelope=smoothstep(0.,.13,ringAge)*exp(-2.7*max(0.,ringAge));
 float tipPhase=TAU*ringAge*(5.8+1.9*mountainSide)+uv.x*14.;
 float tipResonance=summit*skyBehindTip*ringEnvelope;
 warped.y+=ridge*.0012*sin(drift-turn)+trace*(.0038+.009*shell)*vibration;
 warped.y+=trace*shell*.0045*ridgeRoll;
 warped.y+=summit*crestLight*(.003+.004*shell)*sin(crestPhase*2.-turn);
 warped.y+=.009*tipResonance*sin(tipPhase);

 /* Layered perspective swells travel from the horizon toward the foreground. */
 float persp=1./max(.06,uv.y-horizon+.06);
 float rollPhase=persp*1.6+turn*3.+sin(uv.x*9.+turn)*.8;
 float crossSwell=persp*2.85+turn*5.-uv.x*12.;
 float roll=.74*sin(rollPhase)+.26*sin(crossSwell);
 warped.y+=water*(.0015+.0075*depth)*roll;
 warped.x+=water*depth*.0028*sin(uv.y*52.-turn*2.+uv.x*7.);

 /* The ring launches a widening swell that pushes the artwork toward the viewer. */
 float progress=clamp((phase-.09)/.78,0.,1.);
 float surface=(uv.y-horizon)/(1.-horizon);
 float fromCenter=abs(uv.x-.5);
 float crest=.97*pow(progress,1.5)-.52*fromCenter*fromCenter;
 float distanceToCrest=(surface-crest)/mix(.032,.145,progress);
 float travel=smoothstep(0.,.12,progress)*(1.-smoothstep(.83,1.,progress));
 float swell=exp(-distanceToCrest*distanceToCrest)*travel;
 float trailing=distanceToCrest+1.25;
 float trough=exp(-trailing*trailing)*travel;
 warped.y-=water*(.004+.021*depth)*(swell-.30*trough);

 /* Keep the source edges fixed as the water rolls through the frame. */
 vec2 edge=smoothstep(vec2(0.),vec2(.035),uv)*(1.-smoothstep(vec2(.965),vec2(1.),uv));
 warped=uv+(warped-uv)*edge.x*edge.y;
 warped=clamp(warped,vec2(.001),vec2(.999));
 vec3 col=texture2D(artwork,warped).rgb;
 col*=1.+shell*(.06*ridge+(.15+.14*(.5+.5*ridgeRoll))*trace);
 vec3 crestTint=mix(vec3(1.,.28,.37),vec3(.23,.63,1.),step(.5,uv.x));
 float ridgeGlow=summit*crestLight*(.34+.26*shell)+.26*tipResonance*(.52+.48*cos(tipPhase));
 col+=max(vec3(0.),1.-col)*crestTint*ridgeGlow;
 float lum=dot(col,vec3(.21,.65,.14));
 col+=col*water*smoothstep(.27,.82,lum)*(.12*cos(rollPhase)*depth+.23*swell-.14*trough);
 if(water>0.){
  vec2 farCrest=vec2(.50,.57), middleCrest=vec2(.63,.67), nearCrest=vec2(.72,.80);
  vec3 accents=
    waterAccent(uv,farCrest,vec2(.12,.052),vec3(.49,1.,.79),waveAge-waterArrival(farCrest,horizon),4.*turn)
   +waterAccent(uv,middleCrest,vec2(.14,.071),vec3(.18,.88,1.),waveAge-waterArrival(middleCrest,horizon),4.*turn+2.1)
   +waterAccent(uv,nearCrest,vec2(.15,.091),vec3(.54,.51,1.),waveAge-waterArrival(nearCrest,horizon),4.*turn+4.2);
  col+=max(vec3(0.),1.-col)*accents*smoothstep(.42,.77,lum)*water;
 }
 /* The wave downbeat lifts the existing reflection just below the orb. */
 float reflectionPulse=smoothstep(.12,.27,waveAge)*(1.-smoothstep(.29,.72,waveAge));
 float reflectionWidth=(uv.x-moon.x)/.077;
 float reflectionMask=water*exp(-reflectionWidth*reflectionWidth)
   *(1.-smoothstep(horizon+.03,horizon+.16,uv.y))*smoothstep(.21,.72,lum);
 vec3 orbReflection=mix(vec3(.67,.31,.32),vec3(.15,.67,.88),smoothstep(-.028,.028,uv.x-moon.x));
 col+=max(vec3(0.),1.-col)*orbReflection*reflectionMask
   *(.085+.04*(.5+.5*hover)+.145*reflectionPulse);
 /* Clear the fixed baked orb so only the current sky shows through the floating orb. */
 /* Each row is rebuilt from the sky at both ends of its chord, so the fill meets the */
 /* surrounding artwork without a seam. */
 vec2 skyLocal=(warped-plate)*vec2(aspect,1.)/radius;
 float clearRadius=1.03;
 if(dot(skyLocal,skyLocal)<clearRadius*clearRadius){
  float chordHalf=sqrt(max(clearRadius*clearRadius-skyLocal.y*skyLocal.y,.000001));
  float rowY=plate.y+skyLocal.y*radius;
  float rowReach=chordHalf*radius/aspect;
  vec3 leftSky=texture2D(artwork,vec2(plate.x-rowReach,rowY)).rgb;
  vec3 rightSky=texture2D(artwork,vec2(plate.x+rowReach,rowY)).rgb;
  col=mix(leftSky,rightSky,clamp(.5+.5*skyLocal.x/chordHalf,0.,1.));
 }
 /* Build the sky and halo behind the translucent orb. */
 float skyLimit=ridgeSkyHeight(warped.x);
 float fromSkyline=warped.y-skyLimit;
 if(fromSkyline<.025){
  float skyMask=1.-smoothstep(-.009,.013,fromSkyline);
  vec3 aurora=equinoxAurora(vec2(uv.x,min(uv.y,skyLimit-.004)),turn);
  vec3 twilight=vec3(.019,.034,.079)*(1.-smoothstep(0.,.40,uv.y));
  col+=(twilight+aurora+vec3(.74,.84,1.)*nightStars(uv))*skyMask;
  float ridgeDistance=fromSkyline/.018;
  float backlight=.12*exp(-ridgeDistance*ridgeDistance)*skyBehindTip*(1.-skyMask);
  col+=aurora*backlight;
  if(dd<1.90){
   // A broad falloff blends the mint and violet halo into the sky.
   float distance=max(dd-1.,0.);
   float halo=(.62*exp(-distance*distance/.058)+.38*exp(-distance/.29))
     *(1.-smoothstep(.56,.90,distance));
   vec3 haloTint=mix(vec3(.36,.85,.68),vec3(.48,.42,.78),smoothstep(-.30,.80,local.x));
   col+=max(vec3(0.),1.-col)*haloTint*(.34*halo*skyMask*outside);
  }
 }
 /* Keep the original face proportions with the two dots on a horizontal axis. */
 if(disc>0.){
  vec2 face=vec2(-local.y,local.x);
  float leftDot=length(face-vec2(0.,-.5)), rightDot=length(face-vec2(0.,.5));
  float colorEdge=max(min(face.x,leftDot-.5),.5-rightDot);
  const float seamWidth=.008;
  float red=1.-smoothstep(-seamWidth,seamWidth,colorEdge);
  float eyeMask=1.-smoothstep(-seamWidth,seamWidth,min(leftDot,rightDot)-.125);
  float warm=mix(red,step(rightDot,leftDot),eyeMask);

  // A broad, shallow gradient keeps both colours saturated all the way to the edge.
  vec3 normal=vec3(local.x,-local.y,sqrt(max(0.,1.-dd*dd)));
  vec3 light=normalize(vec3(-.22,.30,.93));
  float diffuse=smoothstep(-.40,.98,dot(normal,light));
  vec3 ruby=mix(vec3(.73,.17,.23),vec3(.94,.29,.35),diffuse);
  vec3 cobalt=mix(vec3(.083,.27,.54),vec3(.16,.41,.74),diffuse);
  // Let a little of the finished sky show through both colours and their dots.
  const float orbOpacity=.88;
  col=mix(col,mix(cobalt,ruby,warm),disc*orbOpacity);
 }
 // Keep the mist out of the high sky and foreground water.
 if(uv.y>.26&&uv.y<.67){
  // Use the aurora's clock, with small offsets and no water or pulse refraction.
  vec2 mistPoint=uv+vec2(.009*sin(turn+.45),.0025*cos(turn+.45));
  vec2 mistField=mistPoint*vec2(13.,29.);
  float folds=cloudNoise(mistField+vec2(3.8,1.4));
  float detail=cloudNoise(mistField*2.15+vec2(6.1,3.3));
  float density=.62+.38*mix(folds,detail,.24);
  vec2 cloudPoint=mistPoint+vec2(.035*(detail-.5),.027*(folds-.5));

  // Separate wisps catch a few slopes, leaving open gaps along the ridges.
  float slopeMist=.31*mistVolume(cloudPoint,vec2(.11,.339),vec2(.075,.021))
   +.34*mistVolume(cloudPoint,vec2(.26,.438),vec2(.093,.029))
   +.35*mistVolume(cloudPoint,vec2(.78,.406),vec2(.081,.022))
   +.27*mistVolume(cloudPoint,vec2(.91,.357),vec2(.064,.025));

  // The valley fog billows across the lower orb and thins as it drifts over the sea.
  float contour=cloudNoise(vec2(mistPoint.x*8.+1.8,2.1+.12*cos(turn)));
  vec2 valleyPoint=cloudPoint+vec2(0.,.056*(contour-.5));
  float valleyMist=.52*mistVolume(valleyPoint,vec2(.49,.448),vec2(.26,.083));
  float waterMist=.32*mistVolume(cloudPoint,vec2(.54,.553),vec2(.29,.063));
  float fog=1.-(1.-slopeMist*outside)*(1.-valleyMist)*(1.-waterMist);
  fog*=density*(1.-smoothstep(.62,.67,uv.y));
  col=mix(col,vec3(.51,.64,.68),fog);
 }
 gl_FragColor=vec4(max(col,vec3(0.)),1.);
}
`;

export type LandscapeRenderer = {
  setRunning: (value: boolean) => void;
  resize: () => void;
  load: () => void;
  dispose: () => void;
};

export function createLandscapeRenderer(canvas: HTMLCanvasElement, image: HTMLImageElement, ready: (value: boolean) => void): LandscapeRenderer | null {
  const gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: "low-power", preserveDrawingBuffer: false });
  if (!gl) return null;
  const shaders: WebGLShader[] = [];
  let program: WebGLProgram | null = null, buffer: WebGLBuffer | null = null, texture: WebGLTexture | null = null;
  const release = () => { if (buffer) gl.deleteBuffer(buffer); if (texture) gl.deleteTexture(texture); if (program) gl.deleteProgram(program); for (const shader of shaders) gl.deleteShader(shader); };
  try {
    const compile = (kind: number, source: string) => {
      const shader = gl.createShader(kind); if (!shader) throw new Error("Decorative shader unavailable");
      shaders.push(shader); gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error("Decorative shader unavailable");
      return shader;
    };
    program = gl.createProgram(); if (!program) throw new Error("Decorative renderer unavailable");
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX)); gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT)); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("Decorative renderer unavailable");
    gl.useProgram(program);
    buffer = gl.createBuffer(); if (!buffer) throw new Error("Decorative buffer unavailable"); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "position"); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    texture = gl.createTexture(); if (!texture) throw new Error("Decorative texture unavailable"); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const uniforms = Object.fromEntries(["imageSize","viewSize","time","rhythmLength","rhythmStrengths[0]"].map(name => [name, gl.getUniformLocation(program!, name)]));
    let rhythm = rhythmPatterns.length - 1; // Open with the double-tap groove.
    let nextRhythmChange = rhythmChangeSeconds + pulseDelaySeconds;
    const strengths = new Float32Array(16);
    const sendRhythm = () => {
      const pattern = rhythmPatterns[rhythm];
      strengths.fill(0);
      strengths.set(pattern);
      gl.uniform4fv(uniforms["rhythmStrengths[0]"], strengths);
      gl.uniform1f(uniforms.rhythmLength, pattern.length);
    };
    sendRhythm();
    let running = false, disposed = false, loaded = false, frame = 0, last = 0, elapsed = 0;
    const draw = () => { if (!loaded || disposed || gl.isContextLost()) return; gl.uniform1f(uniforms.time, elapsed); gl.drawArrays(gl.TRIANGLES, 0, 6); };
    const resize = () => {
      if (disposed) return;
      const rect = canvas.getBoundingClientRect();
      const scale = Math.min(window.devicePixelRatio || 1, 1.25, 1280 / Math.max(rect.width, 1), 800 / Math.max(rect.height, 1));
      canvas.width = Math.max(1, Math.round(rect.width * scale)); canvas.height = Math.max(1, Math.round(rect.height * scale));
      gl.viewport(0, 0, canvas.width, canvas.height); gl.uniform2f(uniforms.viewSize, Math.max(1, rect.width), Math.max(1, rect.height));
      draw();
    };
    const tick = (now: number) => {
      frame = 0; if (!running || disposed || !loaded || document.hidden || gl.isContextLost()) return;
      if (!last) last = now;
      if (now - last >= 1000 / 24) {
        elapsed += Math.min(now - last, 100) / 1000;
        last = now;
        if (elapsed >= nextRhythmChange) {
          // Switch on the wave downbeat after the previous phrase has settled.
          rhythm = (rhythm + 1 + Math.floor(Math.random() * (rhythmPatterns.length - 1))) % rhythmPatterns.length;
          nextRhythmChange += rhythmChangeSeconds;
          sendRhythm();
        }
        draw();
      }
      frame = requestAnimationFrame(tick);
    };
    const setRunning = (value: boolean) => {
      running = value; last = 0;
      if (frame) cancelAnimationFrame(frame); frame = 0;
      if (value && loaded && !disposed && !document.hidden) frame = requestAnimationFrame(tick);
    };
    const load = () => {
      if (disposed || !image.complete || !image.naturalWidth || gl.isContextLost()) return;
      try {
        gl.bindTexture(gl.TEXTURE_2D, texture); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
        gl.uniform2f(uniforms.imageSize, image.naturalWidth, image.naturalHeight);
        loaded = true; resize(); ready(true); setRunning(running);
      } catch { loaded = false; ready(false); }
    };
    return { setRunning, resize, load, dispose: () => { disposed = true; running = false; if (frame) cancelAnimationFrame(frame); ready(false); release(); } };
  } catch { release(); return null; }
}

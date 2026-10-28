/** Decorative image-space motion. It never reads audio or changes playback. */
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
uniform float portrait;
uniform float anchorY;
varying vec2 screenUv;
const float PERIOD=5.2;
const float PULSE_GAP=1.5;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float tri(float x){return abs(fract(x)*2.-1.);}
float playback(float x){return sin(x*31.)*.35+pow(tri(x*17.),4.)*.9+pow(tri(x*47.+.3),6.)*.7-.45;}
float sat(vec3 c){return smoothstep(.10,.30,max(c.r,c.b)-min(c.r,c.b))*smoothstep(.25,.5,max(c.r,c.b));}
void main(){
 float aspect=imageSize.x/imageSize.y, viewport=viewSize.x/viewSize.y;
 vec2 span=viewport>aspect?vec2(1.,aspect/viewport):vec2(viewport/aspect,1.);
 vec2 uv=screenUv*span+vec2((1.-span.x)*.5,(1.-span.y)*anchorY);
 vec2 moon=vec2(.5,mix(.289,.348,portrait)); float radius=mix(.197,.207,portrait);
 vec2 local=(uv-moon)*vec2(aspect,1.)/radius; float dd=length(local);
 float disc=1.-smoothstep(.975,1.0,dd), outside=1.-disc;
 float horizon=mix(.493,.611,portrait);
 float water=smoothstep(horizon-.004,horizon+.04,uv.y);           /* explicit, disc-independent */
 float depth=smoothstep(horizon,1.,uv.y);
 /* Pressure shell: compression ahead of the front, rarefaction behind, fading before the frame edge */
 float phase=min(mod(time,PERIOD+PULSE_GAP)/PERIOD,1.);
 float front=radius*1.05+phase*1.15;
 float dm=length((uv-moon)*vec2(aspect,1.));
 float s=(dm-front)/(.05+.06*phase);
 float shell=exp(-s*s)*(1.-smoothstep(.6,1.,phase))*smoothstep(0.,.05,phase);
 float lens=shell*s*2.;
 vec2 radial=((uv-moon)*vec2(aspect,1.))/max(dm,.0001)/vec2(aspect,1.);
 vec2 warped=uv-radial*lens*.009*outside;
 /* Existing traces: dilated saturation mask, vertical peaky deformation creeping outward, boosted by the shell */
 float neon=max(sat(texture2D(artwork,uv).rgb),max(sat(texture2D(artwork,uv+vec2(0.,.007)).rgb),sat(texture2D(artwork,uv-vec2(0.,.007)).rgb)));
 float band=smoothstep(horizon-.26,horizon-.14,uv.y)*(1.-smoothstep(horizon+.02,horizon+.10,uv.y))*smoothstep(.07,.20,abs(uv.x-.5));
 float dir=sign(uv.x-.5);
 warped.y+=neon*band*outside*(.0025+.009*shell)*playback(uv.x-dir*time*.03+step(0.,dir)*.37);
 /* Water: perspective roll toward the viewer plus the shell's outward surge */
 float persp=1./max(.06,uv.y-horizon+.06);
 float rollPhase=persp*1.6+time*1.5+sin(uv.x*9.+time*.4)*.8;
 warped.y+=water*(.0012+.0035*depth)*sin(rollPhase)-water*lens*.004*depth;
 warped.x+=water*depth*.0018*sin(uv.y*60.-time*1.2+uv.x*7.);
 /* Keep the source edges fixed while retaining the original fast water motion. */
 vec2 edge=smoothstep(vec2(0.),vec2(.035),uv)*(1.-smoothstep(vec2(.965),vec2(1.),uv));
 warped=uv+(warped-uv)*edge.x*edge.y;
 warped=clamp(warped,vec2(.001),vec2(.999));
 /* Restrained radial chromatic separation, present only inside the shell */
 vec2 sep=radial*shell*.0009*outside*edge.x*edge.y;
 vec3 col=vec3(texture2D(artwork,warped+sep).r,texture2D(artwork,warped).g,texture2D(artwork,warped-sep).b);
 float lum=dot(col,vec3(.21,.65,.14));
 col+=col*water*smoothstep(.45,.9,lum)*(.10*max(0.,cos(rollPhase))*depth+.12*max(0.,-lens));
 /* Lunar surface: original mint glow preserved; low-frequency relief only on the lit half */
 if(disc>0.){
  float inside=sqrt(max(0.,1.-dd*dd));
  vec3 n=normalize(vec3(local.x,-local.y,inside));
  /* Keep the cleaned AMOLED moon smooth; retain the original landscape's lunar shading. */
  float light=mix(.88+.12*max(0.,dot(n,normalize(vec3(-.5,.55,.7)))),1.,portrait);
  float relief=((noise(local*2.6+vec2(3.1,7.4))-.5)*.18+(noise(local*5.2)-.5)*.08)*(1.-portrait);
  float breath=1.+.05*exp(-pow(phase/.12,2.));
  col=mix(col,col*(light+relief*smoothstep(.35,.6,lum))*breath,disc);
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
    const uniforms = Object.fromEntries(["imageSize","viewSize","time","portrait","anchorY"].map(name => [name, gl.getUniformLocation(program!, name)]));
    let running = false, disposed = false, loaded = false, frame = 0, last = 0, elapsed = 1.6;
    const draw = () => { if (!loaded || disposed || gl.isContextLost()) return; gl.uniform1f(uniforms.time, elapsed); gl.drawArrays(gl.TRIANGLES, 0, 6); };
    const resize = () => {
      if (disposed) return;
      const rect = canvas.getBoundingClientRect();
      const scale = Math.min(window.devicePixelRatio || 1, 1.25, 1280 / Math.max(rect.width, 1), 800 / Math.max(rect.height, 1));
      canvas.width = Math.max(1, Math.round(rect.width * scale)); canvas.height = Math.max(1, Math.round(rect.height * scale));
      gl.viewport(0, 0, canvas.width, canvas.height); gl.uniform2f(uniforms.viewSize, Math.max(1, rect.width), Math.max(1, rect.height));
      gl.uniform1f(uniforms.anchorY, window.matchMedia("(max-width: 760px)").matches ? .45 : .5); draw();
    };
    const tick = (now: number) => {
      frame = 0; if (!running || disposed || !loaded || document.hidden || gl.isContextLost()) return;
      if (!last) last = now;
      if (now - last >= 1000 / 24) { elapsed += Math.min(now - last, 100) / 1000; last = now; draw(); }
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
        gl.uniform2f(uniforms.imageSize, image.naturalWidth, image.naturalHeight); gl.uniform1f(uniforms.portrait, image.naturalWidth / image.naturalHeight < 1.2 ? 1 : 0);
        loaded = true; resize(); ready(true); setRunning(running);
      } catch { loaded = false; ready(false); }
    };
    return { setRunning, resize, load, dispose: () => { disposed = true; running = false; if (frame) cancelAnimationFrame(frame); ready(false); release(); } };
  } catch { release(); return null; }
}

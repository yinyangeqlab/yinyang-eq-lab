"""Create the common 12-second sky loop in the native coordinates of the artwork."""
from pathlib import Path
import shlex
import subprocess as sp
import sys
import numpy as np
import landscape_plates as plates

here = Path(__file__).resolve().parent
out = Path(sys.argv[1]).resolve()
out.mkdir(parents=True, exist_ok=True)
art = plates.pixels(plates.PANORAMA)
h, w = art.shape[:2]
x = np.arange(w)
crest = np.floor(plates.ridge('panorama', (x+.5)/w)*h-3).astype(int)
# Take the sky side of the neighboring crests as well. This keeps bright, antialiased
# peak pixels out of the moving light when a curtain folds sideways across a summit.
crest = np.min(np.lib.stride_tricks.sliding_window_view(np.pad(crest,7,mode='edge'),15),axis=-1)-4
rows = int(np.ceil(.61*h))
y = np.arange(rows)[:,None]
distance = np.maximum(0,y-crest)
# Continue the soft sky into the hidden area. Reflect its gradient instead of stretching a line of pixels.
sample_y = np.clip(np.minimum(y,crest)-distance*.32,0,h-1)
clean = plates.sample(art,(x+.5)/w,(sample_y+.5)/h)
plates.save(out/'sky-atlas.png',clean)
pkg = 'opencv5' if sp.run(['pkg-config','--exists','opencv5']).returncode==0 else 'opencv4'
flags = shlex.split(sp.check_output(['pkg-config','--cflags','--libs',pkg],text=True))
binary = out/'animate-aurora'
sp.run(['c++','-O3','-std=c++17',str(here/'animate-aurora.cpp'),'-o',binary,*flags],check=True)
target = out/'aurora.partial.mkv'
with sp.Popen([binary,out/'sky-atlas.png',str(h),'288'],stdout=sp.PIPE) as renderer:
    encoder = sp.run(['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-y','-f','rawvideo','-s',
                      f'{w}x{rows}','-pix_fmt','bgr24','-r','24','-i','pipe:0',
                      '-c:v','libx264rgb','-threads','3','-preset','veryfast','-crf','10',target],stdin=renderer.stdout)
    renderer.stdout.close()
    if renderer.wait() or encoder.returncode:
        raise RuntimeError('Failed to render the aurora atlas')
target.replace(out/'aurora.mkv')

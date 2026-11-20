"""A periodic displacement field for ocean swells, neutral across the entire mountain range."""
import subprocess
import sys
import numpy as np

out, width, height = sys.argv[1:]
w, h = int(width), int(height)
mw, mh = 144, 96
y, x = np.mgrid[0:mh, 0:mw]
x, y = x/(mw-1), y/(mh-1)
depth = np.clip((y-.63)/.30, 0, 1)
amplitude = depth*depth*(3-2*depth)
phase = (1/np.maximum(.13, y-.42))*3 + (x-.45)**2*3
enc = subprocess.Popen(['ffmpeg','-nostdin','-v','error','-y','-f','rawvideo','-pix_fmt','rgb24',
                        '-s',f'{mw}x{mh}','-r','24','-i','pipe:0','-c:v','ffv1','-threads','2','-pix_fmt','bgr0',out],
                       stdin=subprocess.PIPE)
for frame in range(288):
    t = frame/288*2*np.pi
    dx = amplitude*w*.0018*(np.sin(phase+t*2) + .4*np.sin(phase*.8-t))
    dy = amplitude*h*.0032*(np.sin(phase-t*2)+.36*np.cos(x*8+phase*2+t*3))
    data = np.stack([128+dx,128+dy,np.full_like(dx,128)], axis=-1)
    enc.stdin.write(np.rint(data).clip(0,255).astype(np.uint8).tobytes())
enc.stdin.close()
sys.exit(enc.wait())

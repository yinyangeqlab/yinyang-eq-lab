"""Separate each wallpaper composition at its measured skyline. Requires NumPy and ImageMagick."""
import argparse
import json
import subprocess
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / 'scripts/wallpapers/artwork'
PANORAMA = ROOT / 'site/components/first-listen/landscape-panorama.webp'
SPANS = {'ultrawide': 1, 'desktop': .88, 'tablet-landscape': .72, 'tablet-portrait': .48, 'phone': .38}


def pixels(path):
    w, h = map(int, subprocess.check_output(['magick', 'identify', '-format', '%w %h', path]).split())
    raw = subprocess.check_output(['magick', path, '-alpha', 'off', '-depth', '8', 'rgb:-'])
    return np.frombuffer(raw, np.uint8).reshape(h, w, 3)


def save(path, raw):
    h, w, channels = raw.shape
    mode = 'rgba' if channels == 4 else 'rgb'
    subprocess.run(['magick', '-size', f'{w}x{h}', '-depth', '8', mode + ':-',
                    '-define', 'png:compression-level=3', 'PNG' + str(channels * 8) + ':' + str(path)],
                   input=raw.tobytes(), check=True)


def ridge(name, u):
    if name == 'desktop':
        encoded = (ROOT / 'site/lib/landscape-ridgeline.json').read_text()
        height = np.array(json.loads(encoded), dtype=np.float32)/65535
    else:
        profile = pixels(ART / 'ridgelines' / (name + '.png'))[0].astype(np.float32)
        height = (profile[:, 0] * 256 + profile[:, 1]) / 65535
    return np.interp(u, (np.arange(len(height)) + .5) / len(height), height)


def sample(image, u, v):
    h, w = image.shape[:2]
    x = np.clip(u * w - .5, 0, w - 1)
    y = np.clip(v * h - .5, 0, h - 1)
    i, j = x.astype(int), y.astype(int)
    dx, dy = (x-i)[..., None], (y-j)[..., None]
    k, m = np.minimum(i+1, w-1), np.minimum(j+1, h-1)
    return np.rint((1-dy)*((1-dx)*image[j, i]+dx*image[j, k]) +
                   dy*((1-dx)*image[m, i]+dx*image[m, k])).astype(np.uint8)


def map_height(y, scale, source_horizon=.56, target_horizon=.56):
    # Keep the crests in proportion, and ease out to include the full sky and water at the edges.
    above = y < target_horizon
    source_extent = np.where(above, source_horizon, 1-source_horizon)
    target_extent = np.where(above, target_horizon, 1-target_horizon)
    d = abs(y-target_horizon) / target_extent
    k = scale * target_extent / source_extent
    return source_horizon + np.sign(y-target_horizon)*source_extent*k*d/(1+(k-1)*d)


def orb(path, size):
    y, x = (np.indices((size, size), dtype=float) + .5) * 2/size - 1
    radius = np.hypot(x, y)
    left, right = np.hypot(y, x+.5), np.hypot(y, x-.5)
    edge = np.maximum(np.minimum(-y, left-.5), .5-right)
    def smooth(a, b, v):
        t = np.clip((v-a)/(b-a), 0, 1)
        return t*t*(3-2*t)
    red = 1-smooth(-.008, .008, edge)
    eye = 1-smooth(-.008, .008, np.minimum(left, right)-.125)
    warm = red*(1-eye) + (left >= right)*eye
    light = np.array([-.22, .30, .93])
    diffuse = smooth(-.4, .98, (-.22*x-.30*y+.93*np.sqrt(np.maximum(0, 1-radius**2)))/np.linalg.norm(light))
    diffuse = diffuse[...,None]
    ruby = np.array([.73,.17,.23]) + diffuse*np.array([.21,.12,.12])
    blue = np.array([.083,.27,.54]) + diffuse*np.array([.077,.14,.20])
    alpha = .88*np.clip(.5+(1-radius)*size/2,0,1)
    rgba = np.dstack([blue+(ruby-blue)*warm[...,None], alpha])
    save(path, np.rint(rgba*255).astype(np.uint8))


def layers(layout, artwork, width, height, native_art, destination):
    destination.mkdir(parents=True, exist_ok=True)
    pan = pixels(PANORAMA)
    x = (np.arange(width)+.5)/width
    pan_x = .5 + (x-.5)*SPANS[layout]
    sky_ridge = ridge('panorama', pan_x)
    aspect = width/height
    scale = SPANS[layout]*(pan.shape[1]/pan.shape[0])/aspect
    if artwork == 'panorama':
        land, u = pan, pan_x
        hline = map_height(sky_ridge, 1/scale)
    else:
        native = layout if layout in ('phone','tablet-landscape','tablet-portrait') else 'desktop'
        source = ROOT / 'public/brand-landscape.webp' if native == 'desktop' else native_art / ('landscape-'+layout+'.png')
        land = pixels(source)
        ratio = land.shape[1]/land.shape[0]
        span_x, span_y = min(1, aspect/ratio), min(1, ratio/aspect)
        u = .5+(x-.5)*span_x
        offset = (1-span_y)*(.22 if native == 'desktop' else .5)
        hline = (ridge(native, u)-offset)/span_y
        # Align broad sky regions only. Following individual peak pixels in the
        # sky coordinates makes their sawtooth silhouette appear inside the lights.
        horizon = hline[width//2]
        excess = np.maximum(0, map_height(hline, scale, target_horizon=horizon)-sky_ridge+5/pan.shape[0])
        radius = max(2, round(.032*width))
        windows = np.lib.stride_tricks.sliding_window_view(np.pad(excess,radius,mode='edge'),2*radius+1)
        envelope = np.max(windows,axis=1)
        taps = np.arange(-radius,radius+1)
        kernel = np.exp(-.5*(taps/(radius*.45))**2)
        correction = np.convolve(np.pad(envelope,radius,mode='edge'),kernel/kernel.sum(),mode='valid')

    atlas_y = np.empty((height, width), np.uint16)
    ground = np.empty((height, width, 4), np.uint8)
    for start in range(0, height, 100):
        stop = min(height, start+100)
        y = ((np.arange(start, stop)+.5)/height)[:,None]
        if artwork == 'panorama':
            v = map_height(y, scale)
            sv = v
        else:
            v = offset+y*span_y
            # Retain the upper sky's sweep. Near a differently shaped foreground,
            # ease the sky coordinates toward the unobstructed side of that crest.
            sv = map_height(y, scale, target_horizon=horizon)
            t = np.clip((y/horizon-.18)/.68, 0, 1)
            sv = sv-correction*t*t*(3-2*t)
        sv = np.minimum(sv, sky_ridge-3/pan.shape[0])
        atlas_y[start:stop] = np.rint(np.clip(sv*pan.shape[0]*2-.5, 0, 2*np.ceil(.61*pan.shape[0])-1))
        ground[start:stop,:,:3] = sample(land, u, v)
        ground[start:stop,:,3] = np.rint(255*np.clip(1+(y-hline)*height, 0, 1)).astype(np.uint8)
    atlas_x = np.rint(np.clip(pan_x*pan.shape[1]*2-.5, 0, pan.shape[1]*2-1)).astype(np.uint16)
    for name, array in [('map-x', np.broadcast_to(atlas_x,(height,width))), ('map-y',atlas_y)]:
        subprocess.run(['magick','-size',f'{width}x{height}','-depth','16','-endian','MSB','gray:-',
                        '-define','png:color-type=0','-define','png:bit-depth=16',
                        str(destination/(name+'.png'))], input=array.astype('>u2').tobytes(),check=True)
    save(destination/'land.png', ground)
    orb(destination/'orb.png', 512)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('layout', choices=list(SPANS))
    parser.add_argument('artwork', choices=['original','panorama'])
    parser.add_argument('width', type=int)
    parser.add_argument('height', type=int)
    parser.add_argument('native_art', type=Path)
    parser.add_argument('destination', type=Path)
    layers(**vars(parser.parse_args()))

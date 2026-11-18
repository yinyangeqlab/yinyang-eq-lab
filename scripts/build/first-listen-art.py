"""Paint the stationary and interactive ink layers of each homepage spot illustration."""
from pathlib import Path
import subprocess, sys, tempfile

ink = '#101c24'
def shape(d, fill, stroke='none', width=1):
    return f"fill '{fill}' stroke '{stroke}' stroke-width {width} stroke-linecap round stroke-linejoin round path '{d}'"
def line(d, color, width=1):
    return shape(d, 'none', color, width)
def rect(x,y,w,h,color):
    return shape(f'M{x},{y}h{w}v{h}h{-w}z',color)
def ring(x,y,r,col):
    return f"fill '{col}' stroke none circle {x},{y} {x+r},{y}"
def chip(y,end,col):
    return shape(f'M18,{y} H{end} l-5,7 5,7 H18 Z',col)+ '\n' + line(f'M27,{y+3}v8','#402630',1.5)
rank_under=[line('M16,83h105','#3d5156',1),chip(43,113,'#bf5265'),chip(63,86,'#875263')]
rank_over=[chip(23,138,'#f48c94')]
for x in (31,35,39):
    rank_over.append(line(f'M{x},28v4','#813747',1.3))
tune_under=[]
for i,(x,y) in enumerate([(38,39),(79,57),(120,29)]):
    tune_under.extend([line(f'M{x},16v65','#57978f',2.2),
                       line(' '.join(f'M{x-11},{v}h4' for v in range(20,81,10)),'#456065',1.5)])
    if i!=1:
        tune_under.extend([rect(x-12,y-5,24,10,'#7db3b1'),line(f'M{x-8},{y}h16',ink,1.4)])
tune_over=[rect(65,51,28,12,'#b5ecda'),line('M70,57h18',ink,1.6)]
compare_under=[line('M15,19v58h130 M15,48h130','#364a55',1.3)]
for x in (42,70,98,126):compare_under.append(line(f'M{x},20v57','#2b404a',1))
compare_under.append(line('M17,40 C34,40 39,23 52,27 S68,54 81,51 S104,35 114,43 S129,57 144,51','#e47d8a',4.4))
compare_over=[line('M17,61 C34,61 38,54 51,52 S75,63 85,49 S101,21 111,29 S125,45 144,35','#70a7e4',4.4)]
ballot_under=[shape('M20,60 H141 L132,80 H28 Z','#9d7953'),line('M32,64h96','#261f20',3.5),
              line('M33,87h94','#4f5551',1)]
ballot_over=[]
def slip(dx,dy,fill,trace):
    return [f'push graphic-context translate {dx},{dy} rotate -8',
            shape('M0,0h49v33H0Z',fill),
            line('M7,20c7,0 7,-10 13,-10s9,13 14,8 5,-7 9,-5',trace,2.4),
            'pop graphic-context']
ballot_under+=slip(46,20,'#b39270','#504039')
ballot_over+=slip(68,19,'#efc892','#694b39')
# The two equal cells are painted separately, then vertically packed.
outputs={'ranking':(rank_under,rank_over),'tuning':(tune_under,tune_over),'comparison':(compare_under,compare_over),'contribute':(ballot_under,ballot_over)}
dest=Path(sys.argv[1])
dest.mkdir(parents=True, exist_ok=True)
scratch=tempfile.TemporaryDirectory()
for name,layers in outputs.items():
    cells=[]
    for index, commands in enumerate(layers):
        path=Path(scratch.name) / f'{name}-{index}.png'
        draw='push graphic-context scale 4,4\n'+'\n'.join(commands)+'\npop graphic-context'
        subprocess.run(['magick','-size','640x400','xc:none','-draw',draw,'-depth','8','PNG32:'+str(path)],check=True)
        cells.append(str(path))
    subprocess.run(['magick',*cells,'-append','-define','webp:lossless=true',str(dest/(name+'-print.webp'))],check=True)

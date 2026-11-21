"""Original native-pixel flora for RED. Run with Python 3 and Pillow.

Six 32x24 transparent cells; bottom row is the root/ground anchor. Draw at 2x.
No external artwork is sampled. See README.md for provenance and cell order.
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
INK = '#26302c'
STEM = '#687744'
LEAF = '#92984d'
TIP = '#cec77c'


def leaves(d, x, y):
    d.polygon([(x,y),(x-6,y-2),(x-9,y-7),(x-5,y-6),(x-1,y-2)], fill='#425c3e')
    d.line([(x-8,y-6),(x-4,y-3),(x,y)], fill=LEAF)
    d.polygon([(x,y),(x+2,y-6),(x+7,y-10),(x+6,y-4),(x+2,y-1)], fill=STEM)
    d.line([(x+1,y-1),(x+4,y-6),(x+6,y-8)], fill=TIP)
    d.line([(x-4,y),(x,y-1),(x+4,y)], fill='#46633f')


def bell(d, x, y):
    # Hanging petals: warm shaded left edge, ivory crown, split scalloped hem.
    d.line([(x,y-2),(x,y)], fill=TIP)
    d.polygon([(x-1,y),(x+1,y),(x+2,y+3),(x+3,y+4),
               (x+2,y+5),(x,y+4),(x-2,y+5),(x-3,y+4),(x-2,y+3)], fill='#8f754a')
    d.polygon([(x,y),(x+1,y+1),(x+1,y+3),(x+2,y+4),
               (x,y+3),(x-2,y+4),(x-1,y+1)], fill='#f0dca1')
    d.line([(x,y+1),(x,y+3)], fill='#fff1ca')
    d.point((x+2,y+4), fill='#fff1ca')


def lily(short=False):
    im=Image.new('RGBA',(32,24));d=ImageDraw.Draw(im)
    leaves(d,16,23)
    if short:
        paths=[[(16,22),(16,12),(18,9),(21,9),(23,11)],
               [(16,20),(14,16),(10,13),(7,13),(6,15)]]
        blooms=[(23,13),(6,17)]
    else:
        paths=[[(16,23),(17,16),(17,7),(19,3),(22,3),(24,5)],
               [(17,13),(14,9),(10,9),(8,11)],
               [(17,19),(21,13),(25,13),(27,15)]]
        blooms=[(24,7),(8,13),(27,17)]
    for path in paths:
        d.line([(x+1,y) for x,y in path], fill='#3e5134')
        d.line(path, fill=LEAF)
        d.point(path[2], fill=TIP)
    for x,y in blooms:bell(d,x,y)
    return im


def mushroom(d,x,base,size,blue=False):
    dark,shade,red,light=('#173e4a','#286e7c','#54aeb4','#9ad7cb') if blue else ('#512431','#8f303b','#c64c49','#ec7b60')
    cap=base-size-4
    # Slightly bent cream stalk, underside gills and a broad asymmetrical cap.
    d.polygon([(x-1,cap+3),(x+1,cap+3),(x+1,base-2),(x+3,base),(x-2,base),(x,base-3)],fill='#655443')
    d.line([(x,cap+4),(x,base-1),(x+1,base)],fill='#d4c39b')
    d.line([(x+1,cap+4),(x+1,base-1)],fill='#f0dbb2')
    d.polygon([(x-size,cap+3),(x-size+2,cap),(x-2,cap-2),(x+2,cap-2),
               (x+size-1,cap),(x+size,cap+3),(x+size-2,cap+5),(x-size+1,cap+4)],fill=dark)
    d.polygon([(x-size+1,cap+2),(x-size+3,cap),(x-1,cap-1),(x+2,cap-1),
               (x+size-2,cap+1),(x+size-1,cap+3),(x-size+1,cap+3)],fill=red)
    d.line([(x-size+3,cap),(x-1,cap-1),(x+2,cap-1)],fill=light)
    d.line([(x-size+2,cap+4),(x+size-2,cap+4)],fill='#b79c7c' if not blue else '#5a9295')
    for dx,dy in [(-2,0),(2,2),(-size+2,2)]:
        d.point((x+dx,cap+dy),fill='#f6e2b2' if not blue else '#d3eee0')
    if size>=6:d.point((x-2,cap+1),fill='#f6e2b2' if not blue else '#d3eee0')


def cluster(blue=False,small=False):
    im=Image.new('RGBA',(32,24));d=ImageDraw.Draw(im)
    mushroom(d,10 if small else 18,22,4 if small else 7,blue)
    mushroom(d,23 if small else 7,23,3 if small else 4,blue)
    if not small:mushroom(d,27,23,3,blue)
    for x,y in [(3,23),(14,23),(29,23)]:
        d.line([(x-1,y),(x-2,y-3)],fill='#426344')
        d.line([(x,y),(x+1,y-2)],fill='#869d58')
    return im


def main():
    cells=[lily(),lily(True),cluster(),cluster(small=True),cluster(True),cluster(True,True)]
    sheet=Image.new('RGBA',(32*len(cells),24))
    for i,cell in enumerate(cells):sheet.paste(cell,(i*32,0))
    dest=ROOT/'poker-web/assets/environment/woodland-flora.png'
    sheet.save(dest,optimize=True)
    print(dest)


if __name__=='__main__':main()

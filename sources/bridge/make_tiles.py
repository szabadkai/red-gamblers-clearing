"""Compile the Huntsman's Bridge native tiles. Run with Python and Pillow."""
import json
from functools import lru_cache
from math import cos, pi, sin
from pathlib import Path
from random import Random

from PIL import Image, ImageDraw, ImageOps

GAME = Path(__file__).resolve().parents[2] / "poker-web"
FOREST = Image.open(GAME / "assets/environment/terrain.png").convert("RGBA")
# One uniform source pitch for all the carved trim, plants and fixtures. The
# resulting components are composed on the same 16px grid as Lantern Wood.
quarry = Image.open(GAME / "assets/concept/bridge-atlas-v1.png").convert("RGBA").reduce(3)
QUARRY = quarry.crop((0, 236, 205, 391))
T = 16
AIR = (0, 0, 0, 0)
INK, DEEP, JOINT, COOL = '#10141f', '#202830', '#35363a', '#455155'
UMBRA, SHALE, GREY, DUST, PALE = '#463e41', '#5d5052', '#746465', '#91807a', '#ad9d8c'
# Sample the five opaque greens from the woodland turf, darkest roots to leaf tips.
turf = FOREST.crop((16,16,64,32))
GRASS_RAMP = sorted({(r,g,b) for count,(r,g,b,a) in turf.getcolors()
                     if a and g > max(r,b)}, key=lambda rgb: rgb[1])
ROOT, SHADED_LEAF, LEAF_GREEN, SUNLIT_LEAF, GRASS_TIP = GRASS_RAMP
CARMINE, LEAF, VERMILION = '#642535', '#992e3a', '#bc4547'
PALETTE = [tuple(bytes.fromhex(c[1:])) for c in (
    INK, DEEP, JOINT, COOL, UMBRA, SHALE, GREY, DUST, PALE, '#667476', '#819796',
    '#343427', '#515134', '#72703b', '#92904a', '#b9a450', '#d6bf71', '#37222b', CARMINE, LEAF, VERMILION,
    '#d35b4d', '#4d392d', '#69513c', '#8d6c4c', '#b29669')]
tiles = []
ornaments = {}
wall_sets = {}


@lru_cache(maxsize=None)
def match(rgb):
    if olive(*rgb):
        return moss_color(*rgb)
    return min(PALETTE, key=lambda p: sum(w*(a-b)**2 for a,b,w in zip(rgb,p,(2,3,2))))


def source(x, y, w, h, keep=None):
    piece = QUARRY.crop((x, y, x+w, y+h))
    piece.putdata([(*match((r,g,b)), 255) if a >= 130 and (keep is None or keep(r,g,b)) else AIR
                   for r,g,b,a in (piece.getpixel((u,v)) for v in range(h) for u in range(w))])
    return piece


def cut(im, x, y):
    return im.crop((x,y,x+T,y+T))


def blank(w=T, h=T):
    return Image.new('RGBA', (w,h))


def tile(im):
    assert im.size == (T,T)
    tiles.append(im)
    return len(tiles)-1


def motif(name, im):
    assert im.width % T == im.height % T == 0
    rows = []
    for y in range(0,im.height,T):
        row = []
        for x in range(0,im.width,T):
            cell = cut(im,x,y)
            row.append(tile(cell) if cell.getbbox() else -1)
        rows.append(row)
    ornaments[name] = rows


def wall(left, right, v):
    """Half-stones at both ends have matching profiles in every variant."""
    im = Image.new('RGBA',(T,T),DEEP)
    d = ImageDraw.Draw(im)
    for row,(y,h) in enumerate(((0,5),(5,5),(10,6))):
        a = (4,6,3)[row]+left
        b = (12,13,11)[row]-right
        for start,end,key in [(-6,a,left+row),(a,b,v+row+1),(b,23,right+row)]:
            face,edge,shadow = ((UMBRA,SHALE,JOINT),(SHALE,GREY,UMBRA),
                                (JOINT,COOL,DEEP),(GREY,DUST,SHALE))[key%4]
            d.polygon([(start,y+1),(start+1,y),(end-2,y),(end-2,y+h-3),
                       (end-3,y+h-2),(start+1,y+h-2)],fill=face)
            d.line((start+1,y,end-3,y),fill=edge)
            d.line((start+2,y+h-2,end-3,y+h-2),fill=shadow)
            if start == a and end-start > 6:
                d.line([(start+1,y+1),(start+3,y+1),(start+2,y+2)],fill=edge)
                if v == 1:
                    d.line((end-4,y+2,end-5,y+3),fill=shadow)
    return im


def weathered_walls():
    # Keep the outside pixels in all four families. Chipping the central face
    # changes the block silhouette while the two halves of adjacent stones join.
    wall_sets['cut'] = list(range(8))
    for finish in ('chipped', 'lichen', 'damp'):
        ids = []
        for code in range(8):
            im = tiles[code].copy()
            d = ImageDraw.Draw(im)
            y = (0, 5, 10)[code % 3]
            x = (5, 7, 4)[code % 3] + (code >> 2)
            if finish == 'chipped':
                d.line([(x+1,y),(x+2,y+1),(x+2,y+2),(x+4,y+3)],fill=JOINT)
                d.point((x+3,y+2),fill=GREY)
                d.line((x+4,y+2,x+5,y+2),fill=SHALE)
            elif finish == 'lichen':
                d.line([(x-2,y+1),(x-1,y),(x+2,y),(x+3,y+1)],fill=SHADED_LEAF)
                d.line((x-1,y,x+1,y),fill=LEAF_GREEN)
                d.point((x+1,y+1),fill=SUNLIT_LEAF)
                d.line([(x+2,y+3),(x+3,y+3),(x+3,y+4)],fill=ROOT)
            else:
                d.line([(x,y+1),(x+1,y+1),(x+1,y+3),(x+3,y+4)],fill=COOL)
                d.line((x+2,y+3,x+4,y+3),fill=JOINT)
            ids.append(tile(im))
        wall_sets[finish] = ids


def slab(i, mossy):
    im = blank()
    d = ImageDraw.Draw(im)
    joint = [5,12,8,3][i]
    for x,end,face in [(-2,joint-1,GREY),(joint+1,17,SHALE)]:
        d.polygon([(x,1),(x+1,0),(end,0),(end,2),(end-1,4),(x,4)], fill=face)
        d.line((x+1,0,end-1,0),fill=DUST if i%2 else PALE)
        d.line((x,4,end-1,4),fill=JOINT)
    if mossy:
        im.alpha_composite(source([57,66,102,144][i],33,T,10,olive))
    return im


def olive(r,g,b):
    return g > b*1.23 and .82*g < r < 1.45*g


def moss_color(r,g,b):
    # Assign the painted value to a native turf color. Most exposed growth is
    # blade-green, with the brightest tips confined to the original highlights.
    value = (r + 2*g) // 3
    return GRASS_RAMP[sum(value >= stop for stop in (44, 69, 106, 154))]


def bough_strip():
    original = Image.open(GAME/'assets/concept/bridge-bough-v1.png').convert('RGBA')
    art = original.crop((0,250,original.width,570))
    art = art.resize((round(art.width * .15),48),Image.Resampling.LANCZOS)
    for y in range(art.height):
        for x in range(art.width):
            r,g,b,a = art.getpixel((x,y))
            if a < 140:
                art.putpixel((x,y), AIR)
            elif olive(r,g,b):
                art.putpixel((x,y), (*moss_color(r,g,b),255))
            else:
                art.putpixel((x,y), (r,g,b,255))
    art.save(GAME/'assets/bridge/moss-bough.png',optimize=True)


def ivy(r,g,b):
    return r > 1.6*g and r > 1.26*b


def woodland():
    for l in range(2):
        for r in range(2):
            for v in range(2):
                tile(wall(l,r,v))
    for mossy in (False,True):
        for i in range(4):
            tile(slab(i,mossy))
    for x,y in [(176,48),(192,48),(176,16),(192,16)]:
        tile(cut(FOREST,x,y))
    for x,y in [(16,16),(32,16),(48,16),(32,32),(16,32),(48,32),(16,16),(48,16)]:
        tile(cut(FOREST,x,y) if len(tiles)<26 else ImageOps.mirror(cut(FOREST,x,y)))


def parapets():
    # The source walk line is y=34. The spindles, two end posts and broken
    # lengths are separate modules. Each can meet a bare stretch of coping.
    motif('newel',source(23,2,32,32))
    motif('farNewel',source(156,2,32,32))
    for i,x in enumerate((61,77,93)):
        motif('rail'+str(i),source(x,2,16,32))
    broken = source(67,2,16,32)
    ImageDraw.Draw(broken).polygon([(9,0),(15,0),(15,31),(6,31),(8,20),(11,17),(9,16)],fill=AIR)
    motif('brokenRail',broken)
    motif('brokenLeft',ImageOps.mirror(broken))
    stub = source(23,2,32,32)
    ImageDraw.Draw(stub).polygon([(0,0),(31,0),(31,27),(24,27),(23,23),(18,24),
                                   (17,21),(12,22),(9,25),(0,26)], fill=AIR)
    motif('stump',stub)
    for i,brace in enumerate((False, True)):
        im=blank(); d=ImageDraw.Draw(im)
        d.polygon([(0,3),(15,4),(15,7),(0,6)],fill='#49352e')
        d.line([(0,3),(6,3),(11,4),(15,4)],fill='#a38559')
        if brace:
            d.polygon([(0,13),(13,5),(15,5),(15,8),(2,15),(0,15)],fill='#694d3e')
            d.line((1,13,12,6),fill='#977754')
            d.rectangle((12,2,14,15),fill='#503d35')
            d.point((13,5),fill=PALE)
        motif(['timber','brace'][i],im)


def growth():
    for name,x,width in [('mossBank',5,48),('mossSeam',112,48),('mossLip',180,16)]:
        motif(name,source(x,32,width,32,olive))
    # Isolate leaves from the source masonry, retain the forked leaf shapes
    # and stems. These are deliberately different silhouettes, not flipped vines.
    for name,x,y,w,h in [('longIvy',26,31,48,80),('forkIvy',157,32,32,64)]:
        motif(name,source(x,y,w,h,ivy))
    motif('grass',source(7,17,32,16,olive))
    motif('fern',cut(FOREST,384,32))
    motif('sprig',cut(FOREST,368,32))
    # Shaded moss curtain with several independent lobes, sourced from the
    # broken west lip and the lichen caught on the springing course.
    im=blank(32,32)
    im.alpha_composite(source(9,34,21,18,olive),(1,0))
    im.alpha_composite(source(23,87,16,22,olive),(12,0))
    motif('hangingMoss',im)


def supports():
    # Dressed limestone backing and the projecting capital are separate from
    # the radial ring so the pier can continue beneath either opening.
    motif('shaft',source(27,112,16,16))
    motif('shaftFoot',source(33,123,16,16))
    motif('impost',source(23,91,32,16))
    motif('farImpost',source(155,91,32,16))
    ledge=blank(16,16)
    ledge.paste(source(29,94,16,9),(0,0))
    ImageDraw.Draw(ledge).polygon([(0,7),(3,7),(5,11),(9,12),(10,15),(0,15)],fill=AIR)
    motif('corbel',ledge)


def arch(cols,seed,finish):
    width = cols*T
    radius = width//2
    spring = radius+4
    height = (spring+T-1)//T*T
    ring = 13 if cols==10 else 11
    im = blank(width,height)
    def edge(col,row):
        return 0 if col in (0,cols) else Random(seed+17*col+51*row).randrange(2)
    def bond(col,row):
        code = edge(col,row)*4 + edge(col+1,row)*2 + (seed+col+row)%2
        return wall_sets[finish if (col+row)%3 else 'cut'][code]
    for y in range(0,height,T):
        for x in range(0,width,T):
            im.paste(tiles[bond(x//T,y//T)],(x,y))
    d=ImageDraw.Draw(im)
    d.ellipse((1,4,width-2,spring+radius),fill=AIR)
    d.rectangle((1,spring,width-2,height),fill=AIR)
    rng=Random(seed)
    count=19 if cols==10 else 15
    angles=[pi]+[pi*(1-(i+rng.uniform(-.20,.20))/count) for i in range(1,count)]+[0]
    def point(a,r):
        return (round(radius-.5+cos(a)*r),round(spring-sin(a)*r))
    def mix(a,b,f):
        return tuple(round(p+(q-p)*f) for p,q in zip(a,b))
    for i,(a,b) in enumerate(zip(angles,angles[1:])):
        key=i==count//2
        outer=radius+(1 if key else 0)
        inner=radius-ring-(3 if key else 0)
        oa,ob=point(a,outer),point(b,outer)
        ia,ib=point(a,inner),point(b,inner)
        da,db=(ia[0]+2,ia[1]+4),(ib[0]+2,ib[1]+4)
        d.polygon([ia,ib,db,da],fill=JOINT)
        d.line((da,db),fill=INK)
        light=.13 < i/count < .77
        face,mid,highlight,shade=rng.choice((
            (GREY,DUST,PALE,SHALE),(SHALE,GREY,DUST,UMBRA),(GREY,GREY,DUST,UMBRA)
        ) if light else ((UMBRA,SHALE,GREY,JOINT),(SHALE,GREY,DUST,UMBRA)))
        if key: face,mid,highlight,shade=DUST,PALE,'#c5b295',GREY
        d.polygon([oa,ob,ib,ia],fill=face)
        d.polygon([oa,mix(oa,ob,.7),mix(ob,ib,.25),mix(oa,ia,.50)],fill=mid)
        d.polygon([ia,mix(oa,ia,.7),mix(ob,ib,.84),ib],fill=shade)
        d.line([oa,mix(oa,ob,.5)],fill=highlight)
        d.line([oa,ia],fill=JOINT)
        # Small broken planes cross a wedge diagonally, following the impact
        # face. Recessed stones at the mill catch cool reflected water light.
        if i%5 == seed%5:
            upper = mix(oa,ob,.22)
            split = mix(upper,mix(ia,ib,.48),.46)
            d.line((upper,split),fill=shade)
            d.line([split,(split[0]+2,split[1]+1)],fill=JOINT)
        if finish=='damp' and i/count > .63:
            d.line([mix(ia,ib,.25),mix(ia,ib,.62)],fill=COOL)
        notch=mix(oa,ob,.62)
        if i%3==1:
            d.line([notch,(notch[0]+1,notch[1]+2),(notch[0]-1,notch[1]+4)],fill=shade)
        if i in (2,count-5):
            d.line([mix(oa,ob,.12),mix(oa,ob,.5)],fill=SUNLIT_LEAF)
    for x in (0,width-ring):
        d.rectangle((x,spring,x+ring-1,height),fill=UMBRA)
        d.line((x,spring+1,x+ring-2,spring+1),fill=GREY)
    rows=[]
    for y in range(0,height,T):
        row=[]
        for x in range(0,width,T):
            cell=cut(im,x,y)
            idx=bond(x//T,y//T)
            row.append(-1 if not cell.getbbox() else idx if cell.tobytes()==tiles[idx].tobytes() else tile(cell))
        rows.append(row)
    feet=[]
    for right in (False,True):
        foot=blank()
        foot.paste(source(29 if right else 37,113,ring,T),(T-ring if right else 0,0))
        feet.append(tile(foot))
    return dict(feet=feet,rows=rows)


bough_strip()
woodland()
weathered_walls()
parapets()
growth()
supports()
arches = {
    'HIGH_ARCH': arch(10,21,'lichen'),
    'SMALL_ARCH': arch(7,9,'chipped'),
    'MILL_HIGH_ARCH': arch(10,44,'damp'),
    'MILL_SMALL_ARCH': arch(7,32,'lichen'),
}
for family in wall_sets.values():
    for code, idx in enumerate(family):
        right = tiles[idx].crop((15,0,16,16)).tobytes()
        for next_code in range(8):
            if (code >> 1) & 1 == next_code >> 2:
                assert right == tiles[next_code].crop((0,0,1,16)).tobytes()
        assert tiles[idx].crop((0,0,1,16)).tobytes() == tiles[code].crop((0,0,1,16)).tobytes()
atlas=blank(8*T,(len(tiles)+7)//8*T)
for i,im in enumerate(tiles):
    atlas.paste(im,(i%8*T,i//8*T))
atlas.save(GAME/'assets/bridge/stone-tiles.png',optimize=True)
with (GAME/'bridge-arches.mjs').open('w') as f:
    f.write('// Generated from sources/bridge/make_tiles.py. Each index is a native 16px cell, -1 is air.\n')
    for name,shape in arches.items():
        f.write(f'export const {name} = {{\n  feet: '+json.dumps(shape['feet'])+',\n  rows: [\n')
        for row in shape['rows']:
            f.write('    '+json.dumps(row)+',\n')
        f.write('  ]\n};\n')
    f.write('export const WALLS = '+json.dumps(wall_sets,indent=None)+';\n')
    f.write('export const DETAILS = {\n')
    for name,rows in ornaments.items():
        f.write('  '+name+': '+json.dumps(rows)+',\n')
    f.write('};\n')

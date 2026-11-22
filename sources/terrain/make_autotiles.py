"""Build 16px cardinal autotiles from the woodland sprites and bridge masonry."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps
from foundations import write_foundations
from stage_tiles import STAGE_MATERIALS, stage_tile, write_details

GAME = Path(__file__).resolve().parents[2] / 'poker-web'
WOOD = Image.open(GAME/'assets/environment/terrain.png').convert('RGBA')
STONE = Image.open(GAME/'assets/bridge/stone-tiles.png').convert('RGBA')
N,E,S,W = 1,2,4,8
T = 16
AIR = (0,0,0,0)
MATERIALS = ('wood','house','cave','chapel','coping','ruin','cave-trim','chapel-trim') + STAGE_MATERIALS + ('wood-trim','house-trim')
RAMPS = {
    'wood': ('#10141f','#202e37','#394a50','#577277','#75a743','#a8ca58'),
    'house': ('#191526','#302739','#4e4051','#71616a','#75a743','#a8ca58'),
    'cave': ('#0d222c','#183a42','#28535a','#397579','#578756','#9dbf73'),
    'chapel': ('#161c2b','#283344','#3f5361','#617989','#91abad','#c6d6c4'),
    'coping': ('#25272c','#463e41','#5d5052','#746465','#91807a','#ad9d8c'),
    'ruin': ('#25272c','#463e41','#5d5052','#746465','#91807a','#ad9d8c'),
}

def cell(sheet,x,y):
    return sheet.crop((x,y,x+T,y+T))

def grass(v):
    # Vary the center of the fringe; the first and last columns share a
    # continuation. A new exposed end is sculpted after choosing this fill.
    base = cell(WOOD,32,16)
    source = cell(WOOD,(32,32,16,48)[v],16)
    if v % 2: source = ImageOps.mirror(source)
    base.paste(source.crop((4,0,13,16)),(3,0))
    base.paste(base.crop((0,0,1,16)),(15,0))
    return base

def stone(v, material):
    im = cell(STONE,16*v,0)
    if material in ('coping','ruin'): return im
    dark,shadow,face,light,*_ = RAMPS[material]
    shades = {'202830':dark,'35363a':shadow,'455155':face,'463e41':shadow,
              '5d5052':face,'746465':light,'91807a':light}
    table = {bytes.fromhex(k): tuple(bytes.fromhex(val[1:])) for k,val in shades.items()}
    for y in range(T):
        for x in range(T):
            rgb = bytes(im.getpixel((x,y))[:3])
            im.putpixel((x,y),(*table[rgb],255))
    return im

def make(material,mask,v):
    if material in STAGE_MATERIALS:
        return stage_tile(material,mask,v,grass(v))
    trim = material.endswith('-trim')
    material = material.removesuffix('-trim')
    top,bottom,left,right = not mask&N, not mask&S, not mask&W, not mask&E
    dark,shadow,face,light,edge,glint = RAMPS[material]
    turf = material in ('wood','house')
    if turf and top:
        im = grass(v)
    elif material=='wood':
        im = cell(WOOD,32,32)
        d=ImageDraw.Draw(im)
        x,y=[(3,3),(7,9),(3,11),(7,3)][v]
        d.line([(x,y+2),(x+2,y),(x+5,y),(x+6,y+1)],fill=shadow)
        d.line((x+2,y,x+4,y),fill=face)
    else:
        im = stone(v,material)
    d=ImageDraw.Draw(im)
    if top and material in ('ruin','coping'):
        # The ashlar ledges and the arches share the very same capstones.
        cap = cell(STONE,v*T,T)
        im.alpha_composite(cap)
    elif top and not turf:
        seam=(5,11,8,4)[v]
        d.rectangle((0,0,15,3),fill=light)
        d.line((0,0,15,0),fill=edge)
        d.line((seam+2,0,min(15,seam+5),0),fill=glint)
        d.line([(seam,0),(seam-1,1),(seam-1,2)],fill=shadow)
        if material=='cave':
            d.line([(seam+1,1),(seam+3,2),(seam+3,4)],fill='#497957')
    if material=='coping':
        d.rectangle((0,5,15,15),fill=AIR)
    elif bottom:
        if turf and top:
            for x in range(T):
                for y in range(8,16):
                    r,g,b,_=im.getpixel((x,y))
                    if not (g>max(r,b) and g>64): im.putpixel((x,y),AIR)
        else:
            for x in range(T):
                chip=(0,0,1,1,1,2,1,0)[(x+v*2)%8]
                d.point((x,15-chip),fill=dark)
                if chip: d.line((x,16-chip,x,15),fill=AIR)
    for is_left,exposed in [(True,left),(False,right)]:
        if not exposed: continue
        for y in range(5 if material=='coping' else T):
            # Top corner catches light. Shallow notches interrupt the side,
            # leaving a stepped cliff profile and an undercut on floating ends.
            inset=(0,0,0,1,1,1,0,0)[(y+v)%8]
            if top and y<2: inset=2-y
            if bottom and material!='coping' and y>=11: inset+=(y-10)//2
            x=inset if is_left else 15-inset
            if inset: d.line((0 if is_left else 15,y,x-1 if is_left else x+1,y),fill=AIR)
            if not im.getpixel((x,y))[3]: continue
            color=(edge if y<2 else ('#468232' if y<6 else face)) if top and turf else (light if is_left else shadow)
            if top and y==0: color=glint
            d.point((x,y),fill=color)
            if 5<y<12 and (y+v)%6<3:
                inner=x+(1 if is_left else -1)
                if im.getpixel((inner,y))[3]: d.point((inner,y),fill=shadow)
        if material in ('ruin','coping'):
            def at(n): return n if is_left else 15-n
            if top:
                # A thick terminal block with a lit bevel and a darker return.
                d.line((at(2),0,at(5),0),fill=glint)
                d.line((at(1),1,at(3),1),fill=edge)
                d.line((at(0),2,at(0),3),fill=light if is_left else shadow)
                d.point((at(1),4),fill=dark)
            if material=='ruin':
                for y in (6,11):
                    d.line((at(1),y,at(3),y),fill=shadow)
                    d.line((at(1),y+1,at(2),y+1),fill=light if is_left else face)
    if trim:
        for y in range(T):
            for x in range(T):
                leaf = turf and im.getpixel((x,y))[1] > max(im.getpixel((x,y))[0:3:2])
                if not ((top and (y<4 or leaf)) or (bottom and y>=13) or
                        (left and x<3) or (right and x>=13)):
                    im.putpixel((x,y),AIR)
    elif material in ('house','cave','chapel'):
        # environment.mjs paints stage-foundations over these and the trim
        # rows redraw the rim, so only the silhouette reaches the screen.
        flat = Image.new('RGBA',im.size,face)
        flat.putalpha(im.getchannel('A'))
        return flat
    return im

atlas=Image.new('RGBA',(16*T,len(MATERIALS)*4*T))
for row,mat in enumerate(MATERIALS):
    for v in range(4):
        for mask in range(16):
            atlas.paste(make(mat,mask,v),(mask*T,(row*4+v)*T))
atlas.save(GAME/'assets/environment/autotiles.png',optimize=True)

write_details(GAME/'assets/environment',WOOD)
write_foundations(GAME/'assets/environment')

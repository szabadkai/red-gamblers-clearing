"""Native-pixel surface patterns and decorations for the trail and story rooms."""
from PIL import Image, ImageDraw, ImageOps
from functools import lru_cache

T = 16
AIR = (0, 0, 0, 0)
# Shadow, recessed face, face, bevel, rim, strongest highlight.
PALETTES = {
    'oak-root': ('#201a22','#39242b','#563036','#805041','#78ab47','#b9d361'),
    'thorn-root': ('#221625','#382033','#593047','#804458','#65964d','#aac568'),
    'schist': ('#102b39','#174452','#245e6c','#38868b','#65b4a0','#a6d6af'),
    'cornice': ('#22283c','#374154','#535f74','#728292','#9aadaa','#c5ccac'),
    'mill-board': ('#242731','#3b3533','#5e4940','#80634d','#a78a63','#d0ab79'),
    'oak-board': ('#322329','#4a302d','#714739','#925e41','#ba8757','#e0b678'),
    'quilt': ('#392334','#6e3449','#963e51','#c85d65','#e68a7d','#f1d6a3'),
    'rib': ('#331929','#4c2337','#6b3044','#934953','#bb9c85','#e5cda8'),
}
STAGE_MATERIALS = tuple(PALETTES)


def root(d, v, colors, top, grass):
    dark, shade, face, bevel, leaf, tip = colors
    bend = (2, -1, 0, -2)[v]
    # Both ends have the same cross-section so the grain travels across cells.
    for y, thickness, fill, glint in [(3,5,bevel,face),(8,4,face,bevel),(13,3,shade,face)]:
        path = [(0,y),(3,y),(7,y+bend),(11,y+bend-1),(15,y)]
        d.line(path, fill=dark, width=thickness)
        d.line([(x, yy-1) for x,yy in path],fill=fill, width=2)
        d.line(path[1:4],fill=glint)
    if top:
        grass = grass.crop((0,0,16,7))
        # Keep the green clusters while letting bark show through their gaps.
        for y in range(7):
            for x in range(16):
                r,g,b,a = grass.getpixel((x,y))
                if a and g > max(r,b):
                    if colors==PALETTES['thorn-root']:
                        col = ('#283e39','#3a6445',leaf,'#80ac56',tip)[sum(g>=t for t in (77,116,143,170))]
                    else: col = (r,g,b)
                    d.point((x,y),fill=col)
    if v==2:
        d.line([(4,9),(6,7),(9,7),(10,8),(8,9),(6,9)],fill=shade)


def schist(d,v,colors,top):
    dark,shadow,face,lit,edge,glint=colors
    fault=(4,10,7,3)[v]
    for y,tilt in [(2,-1),(8,1),(14,-1)]:
        d.polygon([(0,y),(3,y),(fault,y+tilt),(12,y+tilt),(15,y),(15,y+2),
                   (10,y+3),(fault-1,y+3),(2,y+2),(0,y+2)],fill=face)
        d.line([(0,y),(3,y),(fault,y+tilt),(12,y+tilt),(15,y)],fill=lit)
    d.line([(fault+1,4),(fault,6),(fault-2,7)],fill=dark)
    if top:
        d.line((0,0,15,0),fill=edge)
        d.line((fault,0,min(15,fault+3),0),fill=glint)
        if v in (0,3):
            d.polygon([(fault-3,0),(fault+4,0),(fault+5,1),(fault+2,3),
                       (fault+1,5),(fault,3),(fault-3,2)],fill='#39794e')
            d.line([(fault-2,0),(fault+2,0),(fault+3,1)],fill='#87b66c')
            d.point((fault+1,2),fill='#5f9c60')
        else:
            d.line([(fault-1,1),(fault+1,1),(fault+2,2),(fault+4,2)],fill='#5b9966')


def cornice(d,v,colors,top):
    dark,shade,face,lit,edge,glint=colors
    joint=(4,10,7,12)[v]
    d.rectangle((0,1,15,6),fill=lit)
    d.rectangle((0,8,15,14),fill=face)
    d.line((0,7,15,7),fill=dark)
    d.line((0,8,15,8),fill=lit)
    d.line([(joint,0),(joint,3),(joint-1,4),(joint-1,6)],fill=shade)
    if top:
        d.line((0,0,15,0),fill=edge)
        d.line((joint+1,0,min(15,joint+4),0),fill=glint)
        d.point((joint,0),fill=face)
        d.line((0,4,15,4),fill=face)
    if v%2:
        d.line([(joint,9),(joint-1,11),(joint-3,12)],fill=shade)


def boards(d,v,colors,top):
    dark,shade,face,lit,edge,glint=colors
    for y,split in [(0,(2,10,6,13)[v]),(8,(12,5,10,3)[v])]:
        d.rectangle((0,y+1,15,y+6),fill=face)
        d.line((0,y,15,y),fill=lit)
        d.line((0,y+7,15,y+7),fill=shade)
        d.line((split,y,split,y+6),fill=dark)
        d.line((split+1,y+1,split+1,y+5),fill=lit)
        if v in (0,2):
            d.line([(4,y+4),(6,y+4),(8,y+3),(11,y+3)],fill=shade)
        else:
            d.line([(2,y+4),(6,y+4),(7,y+5),(10,y+5),(12,y+4)],fill=lit)
    if top:
        d.line((0,0,15,0),fill=edge)
        nail=(4,12,8,3)[v]
        d.point((nail,2),fill=shade)
        d.point((nail,1),fill=glint)


def quilt(d,v,colors,top):
    dark,shade,face,lit,edge,glint=colors
    seam=(5,11,7,3)[v]
    d.rectangle((0,1,15,13),fill=face)
    d.polygon([(seam-4,5),(seam,2),(seam+4,5),(seam,8)],fill=lit)
    d.line([(seam-2,5),(seam,4),(seam+2,5)],fill='#dcaa77')
    d.line((0,11,15,11),fill=shade)
    d.line((0,12,15,12),fill=lit)
    if top:
        d.line((0,0,15,0),fill=edge)
        d.line((seam+1,1,min(15,seam+4),1),fill=glint)


def rib(d,v,colors,top):
    dark,shade,face,lit,bone,ivory=colors
    bend=(2,4,1,3)[v]
    for y in (2,10):
        d.polygon([(0,y+1),(4,y),(8,y+bend-1),(12,y+1),(15,y+1),
                   (15,y+5),(11,y+4),(8,y+bend+2),(4,y+3),(0,y+4)],fill=face)
        d.line([(0,y+1),(4,y),(8,y+bend-1),(12,y+1),(15,y+1)],fill=lit)
        d.line([(2,y+4),(5,y+3),(8,y+bend+2)],fill=shade)
    if top:
        joint=(5,11,7,3)[v]
        d.polygon([(0,0),(15,0),(15,2),(joint+2,2),(joint,4),(joint-2,3),(0,2)],fill=bone)
        d.line((0,0,15,0),fill=ivory)
        d.line([(joint,0),(joint-1,1),(joint-1,2)],fill='#956b67')


def stage_tile(material,mask,v,grass):
    top,bottom,left,right = (not mask & bit for bit in (1,4,8,2))
    colors=PALETTES[material]
    dark,shade,face,lit,edge,glint=colors
    im=Image.new('RGBA',(T,T),shade)
    d=ImageDraw.Draw(im)
    if material.endswith('-root'): root(d,v,colors,top,grass)
    elif material=='schist': schist(d,v,colors,top)
    elif material=='cornice': cornice(d,v,colors,top)
    elif material=='quilt': quilt(d,v,colors,top)
    elif material=='rib': rib(d,v,colors,top)
    else: boards(d,v,colors,top)
    organic=material.endswith('-root') or material in ('schist','rib')
    if bottom:
        for x in range(T):
            cut=(1,1,2,3,3,2,1,1)[(x+2*v)%8] if organic else (1 if 3+v<=x<=6+v else 0)
            d.line((x,15-cut,x,15),fill=AIR)
            d.point((x,14-cut),fill=dark)
    for side,exposed in [(1,left),(-1,right)]:
        if not exposed: continue
        def inward(n): return n if side==1 else 15-n
        for y in range(T):
            inset=int(top and y==0)+int(bottom and y>9)*(1+(y-10)//2) if organic else int(top and y==0 or bottom and y>=12)
            if inset: d.line((inward(0),y,inward(inset-1),y),fill=AIR)
            x=inward(inset)
            if im.getpixel((x,y))[3]:
                d.point((x,y),fill=(edge if top and y<2 else lit if side==1 else dark))
        if material.endswith('board'):
            for y in (3,11):
                d.line((inward(1),y,inward(3),y+1),fill=shade)
        if material.endswith('root') and bottom:
            d.line([(inward(2),8),(inward(4),10),(inward(5),11)],fill=lit)
    return im


# Each stamp is two ordinary cells wide. y=12 is the walkable surface.
def detail(family,v,terrain,bough):
    im=Image.new('RGBA',(32,32));d=ImageDraw.Draw(im)
    if family=='wood':
        # The woodland fronds, fiddleheads and exposed roots share the game's native ink.
        if v in (0,2):
            turf=terrain.crop((368+16*(v//2),32,384+16*(v//2),48))
            im.alpha_composite(turf,(2 if not v else 15,-3))
        piece=bough.crop(((38,89,137,179)[v],8,(38,89,137,179)[v]+32,24))
        silhouette=Image.new('L',(32,16));sd=ImageDraw.Draw(silhouette)
        sd.polygon([(0,0),(31,0),(27,4),(21,5),(17,9),(9,11),(4,6)],fill=255)
        silhouette.paste(0,(0,0,32,1))
        piece.putalpha(Image.composite(piece.getchannel('A'),Image.new('L',piece.size),silhouette))
        im.alpha_composite(piece,(0,15))
    elif family=='cave':
        for x,h in [[(8,6),(12,4),(23,9)],[(12,8),(19,5)],[(6,7),(19,10),(25,5)],[(14,5),(22,7)]][v]:
            if v%2==0:
                d.line([(x,12),(x,14-h),(x+1,12-h)],fill='#76a999')
                d.polygon([(x-4,13-h),(x-2,10-h),(x+1,9-h),(x+4,11-h),(x+4,13-h)],fill='#387c86')
                d.line([(x-3,11-h),(x,10-h),(x+2,10-h)],fill='#90cab7')
            else:
                d.polygon([(x-4,14),(x+4,14),(x+2,16+h//2),(x,18+h),(x-2,17+h//2)],fill='#28596c')
                d.line([(x-3,14),(x-1,16+h//2),(x,16+h)],fill='#4c9698')
    elif family=='chapel':
        if v%2==0:
            for x in ((7,23) if v==0 else (15,)):
                d.polygon([(x-5,17),(x+5,17),(x+5,20),(x+3,21),(x+2,25),(x,28),(x-2,25),(x-3,21),(x-5,20)],fill='#303747')
                d.line((x-5,17,x+5,17),fill='#96aba3')
                d.polygon([(x-3,19),(x+3,19),(x+2,22),(x,25),(x-2,22)],fill='#657484')
                d.line([(x-2,19),(x-2,21),(x,23)],fill='#93a0a0')
        else:
            x=12 if v==1 else 20
            d.polygon([(x-7,19),(x,15),(x+7,19),(x,23)],fill='#363741')
            d.line([(x-5,19),(x,16),(x+4,19)],fill='#aa9061')
            d.line([(x-4,20),(x,22),(x+4,20)],fill='#776854')
    else:
        path=[(0,15),(4,16),(8,20),(13,22),(18,22+v),(24,18),(31,16)]
        d.line(path,fill='#321c30',width=3)
        d.line([(x,y-1) for x,y in path],fill='#805062')
        for x,y,s in [(5,17,-1),(12,22,1),(20,21,-1),(26,17,1)]:
            d.polygon([(x,y),(x+s*5,y-3),(x+s*4,y),(x+s*2,y+1)],fill='#547a50')
            d.point((x+s*3,y-1),fill='#91af61')
        for x,y in ((10,22),(14,23)) if v%2==0 else ((21,21),):
            d.ellipse((x-1,y,x+2,y+3),fill='#762844');d.point((x,y),fill='#d35a58')
        if v in (1,2): im=ImageOps.mirror(im)
    return im


@lru_cache(maxsize=None)
def nearest_rock(rgb, colors):
    return min(colors,key=lambda p: sum(w*(a-b)**2 for w,a,b in zip((2,3,2),p,rgb)))


def bracket(family,v,bough,props):
    # The material changes, but all capitals, roots and pendants have a fixed
    # native pitch. Empty pixels are part of the silhouette.
    im=Image.new('RGBA',(32,32))
    if family in ('wood','house'):
        x,y=((260,7),(286,6),(275,12),(291,10))[v]
        piece=bough.crop((x,y,x+32,y+32))
        for j in range(32):
            for i in range(32):
                r,g,b,a=piece.getpixel((i,j))
                if family=='house' and a and r>g:
                    piece.putpixel((i,j),(min(255,r+9),max(0,g-6),min(255,b+12),a))
        if v%2: piece=ImageOps.mirror(piece)
        # A tapered root meets the underside of the shelf.
        mask=Image.new('L',im.size)
        ImageDraw.Draw(mask).polygon([(0,0),(31,0),(31,7),(27,9),(24,17),(20,23),
                                     (12,30),(16,19),(18,13),(13,10),(6,9),(0,5)],fill=255)
        piece.putalpha(Image.composite(piece.getchannel('A'),Image.new('L',im.size),mask))
        return piece
    if family=='cave':
        # Four sections of the hanging roots and mineral teeth from the cavern painting.
        shelf=props.crop((455,9,874,382)).reduce(10)
        x=(0,7,3,10)[v]
        piece=shelf.crop((x,shelf.height-32,x+32,shelf.height))
        if v>=2: piece=ImageOps.mirror(piece)
        colors=('#142c37','#20434d','#2e5c62','#427a7b','#639286','#83aa8f')
    else:
        # The worn abacus, carved neck and broken shaft from the chapel pillar.
        piece=props.crop((65,446,335,879)).resize((20,32),Image.Resampling.BOX)
        if v%2: piece=ImageOps.mirror(piece)
        if v in (1,2):
            piece=piece.crop((0,0,20,19 if v==1 else 25))
            cut=ImageDraw.Draw(piece)
            for i in range(20):
                chip=(i//3+v)%4
                if chip: cut.line((i,piece.height-chip,i,piece.height-1),fill=AIR)
        colors=('#262d40','#384254','#4d586a','#636e7d','#83908e','#a6ad9d')
    ramp=tuple(tuple(bytes.fromhex(col[1:])) for col in colors)
    for j in range(piece.height):
        for i in range(piece.width):
            r,g,b,a=piece.getpixel((i,j))
            rgb=(r,g,b)
            if family=='cave': rgb=(int(r*.75),int(g*.94),min(255,b+9))
            piece.putpixel((i,j),(*nearest_rock(rgb,ramp),255) if a>=140 else AIR)
    im.alpha_composite(piece,((32-piece.width)//2,0))
    return im


def write_details(folder,terrain):
    bough=Image.open(folder.parent/'bridge/moss-bough.png').convert('RGBA')
    props=Image.open(folder.parent/'concept/interior-props-v2.png').convert('RGBA')
    sheet=Image.new('RGBA',(128,256))
    for j,family in enumerate(('wood','cave','chapel','house')):
        for v in range(4):
            sheet.paste(detail(family,v,terrain,bough),(v*32,j*32))
            sheet.paste(bracket(family,v,bough,props),(v*32,(j+4)*32))
    sheet.save(folder/'stage-details.png',optimize=True)

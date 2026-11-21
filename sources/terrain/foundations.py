"""Four-by-three-cell ground patterns. Edge codes join adjacent 64px sections."""
from random import Random
from PIL import Image, ImageDraw

SIZE = (64,48)
FAMILIES = ('wood','cave','chapel','house')
PALETTES = {
    'wood': ('#111d27','#1b2931','#293536','#3b473d','#52604d','#667455'),
    'cave': ('#102936','#153c49','#205564','#2b6976','#408389','#65a99d'),
    'chapel': ('#202738','#2b3547','#3c495f','#526377','#728691','#94a6a4'),
    'house': ('#261e30','#382738','#4b3443','#60404d','#79545a','#946d68'),
}


def strata(d,family,left,right,v):
    ink,deep,shade,face,light,glint=PALETTES[family]
    rng=Random(173+v+11*left+7*right)
    # A bedding plane crosses each seam at a shared height and inclination.
    for i,y in enumerate((-14,1,15,32,49)):
        l=y+left*3
        r=y+right*3
        m=y+rng.randint(-3,4)
        xs=[0,7,19,34,45,57,63]
        ys=[l,l,m+1,m-2,m,r,r]
        line=list(zip(xs,ys))
        lower=[(x,yy+9) for x,yy in line]
        d.polygon(line+list(reversed(lower)),fill=shade)
        d.polygon([(7,l+1),(19,m+1),(34,m-2),(41,m-1),(29,m+5),(17,m+6)],fill=face)
        d.line(line,fill=face)
        d.line([(15,m+1),(20,m),(26,m-1),(33,m-2)],fill=light)
        # A wedge breaks away at one of two fracture angles.
        x=rng.randint(25,49)
        d.polygon([(x,m+1),(x+10,m),(x+5,m+6),(x-1,m+8)],fill=deep)
        d.line([(x+8,m+1),(x+5,m+4),(x+4,m+6)],fill=ink)
        if family=='cave' and (v+i)%3==0:
            d.line([(x-9,m+6),(x-5,m+5),(x-2,m+5),(x,m+3)],fill='#5a9585')
            d.line((x-5,m+5,x-3,m+5),fill='#88b197')
    if family=='wood':
        x=(17,32)[v]
        d.line([(x-10,0),(x-9,6),(x-4,11),(x+3,13),(x+5,17),(x+12,21)],fill='#302623',width=3)
        d.line([(x-10,0),(x-9,6),(x-4,10),(x+3,12),(x+6,17)],fill='#66503c')
        d.line([(x-5,10),(x-8,14),(x-9,20),(x-13,24)],fill='#4c3c30')


def masonry(d,family,left,right,v):
    ink,deep,shade,face,lit,glint=PALETTES[family]
    rng=Random(49+v*101+left*3+right*11)
    # Draw two halves of one block at each join. Their course and shade come
    # from the shared boundary code, including the top bevel and lower lip.
    for row in range(3):
        y=row*16
        points=[-12, (5,15,8)[row]+left*3, (25,33,28)[row]+rng.randint(-3,3),
                (48,54,44)[row]+rng.randint(-3,3), 70+right*2]
        for j,(a,b) in enumerate(zip(points,points[1:])):
            tone=left if j==0 else right if j==3 else rng.randrange(2)
            color=(shade,face)[(row+tone)%2]
            rim=(face,lit)[(row+tone)%2]
            d.polygon([(a+1,y+2),(a+3,y),(b-2,y),(b-1,y+2),(b-2,y+12),
                       (b-5,y+14),(a+2,y+14),(a+1,y+11)],fill=color)
            d.line([(a+2,y+2),(a+4,y+1),(b-3,y+1)],fill=rim)
            d.line([(a+3,y+13),(b-5,y+13),(b-3,y+11)],fill=deep)
            if j in (1,2) and (row+j+v)%3==0:
                d.line([(a+4,y+2),(a+5,y+4),(a+4,y+6),(a+7,y+8)],fill=deep)
                d.point((a+6,y+5),fill=rim)
        if family=='house':
            x=rng.randrange(18,43)
            d.line([(x,y),(x-1,y+3),(x-5,y+6),(x-7,y+11)],fill='#40283a',width=2)
            d.point((x-4,y+5),fill='#76505a')


def write_foundations(folder):
    sheet=Image.new('RGBA',(SIZE[0]*8,SIZE[1]*len(FAMILIES)))
    for row,family in enumerate(FAMILIES):
        for code in range(8):
            im=Image.new('RGBA',SIZE,PALETTES[family][1 if family in ('wood','cave') else 0])
            painter=strata if family in ('wood','cave') else masonry
            painter(ImageDraw.Draw(im),family,code>>2,(code>>1)&1,code&1)
            sheet.paste(im,(code*SIZE[0],row*SIZE[1]))
    # Both exposed image borders pass through the same bed or half-stone.
    # Check every permitted left/right combination before replacing the atlas.
    for row,family in enumerate(FAMILIES):
        y=row*SIZE[1]
        for a in range(8):
            for b in range(8):
                if ((a>>1)&1) != b>>2: continue
                x1=(a+1)*SIZE[0]-1
                x2=b*SIZE[0]
                right=sheet.crop((x1,y,x1+1,y+SIZE[1]))
                left=sheet.crop((x2,y,x2+1,y+SIZE[1]))
                assert right.tobytes()==left.tobytes(),(family,a,b)
    sheet.save(folder/'stage-foundations.png',optimize=True)

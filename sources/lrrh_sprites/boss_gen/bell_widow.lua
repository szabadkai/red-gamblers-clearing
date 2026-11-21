-- The Bell Widow. Aseprite: aseprite -b --script bell_widow.lua
-- Right-facing, feet at y=63. The pixel keys keep her embroidered mantle,
-- veil and bell intact while the timber frame articulates beneath them.
local here = debug.getinfo(1, "S").source:match("^@(.*)/[^/]*$")
_G.LIB_SIZE = 64
local L = dofile(here .. "/../enemy_gen/lib.lua")
_G.LIB_SIZE = nil
local P = L.pal {
  k="#241a2a", v="#42253e", m="#672a45", r="#963e57", h="#c45b72",
  b="#50323b", c="#855448", d="#b57b55", g="#dfaa61", a="#ffe59c",
  s="#89778f", l="#baa7ba", p="#e0d3d1", w="#fff1db", e="#ffd455",
  far="#544052", farLit="#806272"
}
local mantle = L.grid({
  ".......kkk...............",
  ".....kkrrhkk.............",
  "....kmmmrrhhkkk..........",
  "...kmmmmmmrrrrhkk........",
  "..kmmmmgmmmmrrrrhkk......",
  ".kmmmmgagmmmmmrrrrrk.....",
  ".kmmmgmmmgmmmmmvmrrrk....",
  "kmmmgmgggmgmmmmvmmrrrk...",
  "kmmgmmmgmmmgmmmmvmmmmrk..",
  "kmmmgmmgmmgmmmvmvvmmmmrk.",
  "kvvmmgggggmmmmvmmvvmmmmrk",
  "kvmvmmmgmmvvmmvvmmvvrrrrk",
  "kvvvmmmmmvvvmmmvmmvvkkvkk",
  "kvrhkkvmvvrhkkvvrhrk.....",
  ".krk.kmvrhk...krhk.......",
  "..k...krhk.....kk........",
  ".......kk................"
}, P)
local hood = L.grid({
  "............kkk..",
  "..........kkppwk.",
  ".........kppwwwpk",
  "........kpppwwwlk",
  "........kpplpwppkk",
  ".......kpplppkkkkk",
  "......klpllplkkkkk",
  ".....kllllppkkeekk",
  "...kkllllpppskkkke",
  ".kklllsspppplkkkk.",
  "kskkssppprmvrppk.",
  "....ksskkrrmvkk..",
  "......kskppvmpk..",
  ".......klpsplkpk.",
  ".......kppslskpk.",
  ".......kpppk.klk.",
  ".......kplpk.kk..",
  "........klpk.....",
  "........klp......",
  ".........kp......",
  ".........k......."
}, P)
local bronze = L.grid({
  "....kgk...", "....c.k...", "....kgk...", "...kcdak..",
  "...bcddgk.", "...bcdggk.", "..kbcddgk.", "..bccddgk.",
  ".kcdddgggk", "kggaaaaagk", ".kbbckkkk.", "....kgk..."
}, P)

-- Inverse sampling maintains solid planes even on the swinging bell.
local function stamp(c, art, px, py, x, y, angle)
  if angle == 0 then c:over(art, L.round(x-px), L.round(y-py)); return end
  local cs, sn = math.cos(angle), math.sin(angle)
  local x0,y0,x1,y1 = L.bounds(art)
  local reach = math.ceil(math.sqrt(math.max(px-x0,x1-px)^2 + math.max(py-y0,y1-py)^2))
  for sy=L.round(y)-reach,L.round(y)+reach do
    for sx=L.round(x)-reach,L.round(x)+reach do
      local dx,dy=sx-x,sy-y
      local col=art:get(px+dx*cs+dy*sn, py-dx*sn+dy*cs)
      if col then c:set(sx,sy,col) end
    end
  end
end

-- One diagonal set takes the load while the other lifts and reaches.
-- Each leg has a hip, a high ogee-shaped knee, a hock and a pointed toe.
local legs = {
  -- hip x, knee x/y, toe x/y, gait offset
  {30,12,36, 8,62,0}, {32,20,41,18,63,4},
  {34,44,44,45,63,0}, {36,52,38,55,62,4}
}
local footX={6,3,0,-3,-6,-4,0,4}
local footLift={0,0,0,0,0,3,6,4}
local function leg(c,j,far,p)
  local def=legs[j]
  local side=j<3 and -1 or 1
  local hx,hy=def[1]+p.x,44+p.y
  local kx,ky=def[2]+p.x,def[3]+p.y
  local tx,ty=def[4],def[5]
  if far then
    kx,ky=kx-side*3,ky-2
    tx,ty=tx-side*6,ty-3
  end
  if p.step then
    local f=(p.step+def[6]+(far and 4 or 0))%8+1
    tx,ty=tx+footX[f],ty-footLift[f]
    kx,ky=kx+footX[f]*.42,ky-footLift[f]*.55
  end
  if j==4 then
    local lift=p.rear*(far and .8 or 1)
    kx,ky=kx+lift*2,ky-lift*9
    tx,ty=L.lerp(tx,far and 53 or 58,lift),L.lerp(ty,far and 15 or 21,lift)
  end
  if p.fold>0 then
    kx=L.lerp(kx,hx+side*(j%2==0 and 14 or 10),p.fold)
    ky=L.lerp(ky,58-(j%2)*3,p.fold)
    tx=L.lerp(tx,hx+side*(j%2==0 and 19 or 10),p.fold)
    ty=L.lerp(ty,62-(far and 2 or 0),p.fold)
  end
  local ax,ay=L.lerp(kx,tx,.62)+side*2,L.lerp(ky,ty,.62)
  local dark,lit=far and P.b or P.c, far and P.farLit or P.d
  c:seg(hx,hy,kx,ky,2,P.k); c:seg(kx,ky,ax,ay,1.7,P.k)
  c:seg(ax,ay,L.lerp(ax,tx,.75),L.lerp(ay,ty,.75),1.05,P.k)
  c:line(L.lerp(ax,tx,.75),L.lerp(ay,ty,.75),tx-side,ty,P.k)
  c:seg(hx,hy-1,kx,ky,1,dark); c:seg(kx,ky,ax,ay,.9,dark)
  c:line(L.lerp(hx,kx,.5),L.lerp(hy,ky,.5)-1,kx,ky-1,lit)
  c:line(kx,ky, L.lerp(kx,ax,.52),L.lerp(ky,ay,.52),lit)
  c:line(ax,ay, L.lerp(ax,tx,.75),L.lerp(ay,ty,.75),far and P.far or P.c)
  if not far then c:set(kx,ky-1,P.g) end
end

-- Pose fields are offsets from the grounded idle drawing.
local function drawPose(p)
  p.x,p.y,p.rear,p.fold=p.x or 0,p.y or 0,p.rear or 0,p.fold or 0
  local c=L.canvas()
  for j=1,4 do leg(c,j,true,p) end
  local pivotX,pivotY=27+p.x,46+p.y
  local angle=p.bell or 0
  local bellX,bellY=pivotX-4*math.sin(angle),pivotY+4*math.cos(angle)
  if p.loose then
    bellX,bellY=p.loose[1],p.loose[2]
  else
    c:line(pivotX,pivotY,bellX,bellY,P.l)
  end
  if not p.loose then stamp(c,bronze,5,0,bellX,bellY,angle) end
  c:ell(32+p.x,44+p.y,8,5,P.k)
  c:ell(33+p.x,43+p.y,7,3,P.b)
  for j=1,2 do leg(c,j,false,p) end
  stamp(c,mantle,18,10,30+p.x,42+p.y+(p.haunch or 0),p.tilt or 0)
  for j=3,4 do leg(c,j,false,p) end
  local head=L.canvas():over(hood)
  if p.shut then head:set(14,7,P.k);head:set(15,7,P.k);head:set(17,8,P.k) end
  local hx,hy=40+p.x+(p.headX or 0),38+p.y+(p.nod or 0)
  stamp(c,head,9,11,hx,hy,p.bow or 0)
  if p.loose then stamp(c,bronze,5,0,bellX,bellY,angle) end
  -- Silk catches between the raised foreleg and the veil before the snap up.
  if p.silk then
    c:curve(hx+6,hy-2, p.silk[1],p.silk[2],p.silk[3],p.silk[4],P.l)
    c:line(p.silk[3],p.silk[4],p.silk[3]-1,p.silk[4]+2,P.w)
  end
  return c
end

local idle={
  {}, {bell=.06}, {y=-1,bell=.12}, {y=-1,bell=.08},
  {y=-1,bell=-.04}, {bell=-.10}, {bell=-.06,shut=true}, {}
}
local silk={
  {y=1,rear=.14,bell=-.06},
  {x=-1,rear=.48,nod=-1,bell=-.17},
  {x=-2,y=-1,rear=.82,nod=-2,bell=-.24,silk={55,43,56,28}},
  {x=-2,y=-2,rear=1,nod=-2,bow=-.12,bell=-.18,silk={55,30,58,21}},
  {x=2,y=-1,rear=.90,nod=-3,bow=-.23,bell=.38,silk={52,25,60,13}},
  {x=2,y=1,rear=.47,nod=1,bell=.28},
  {x=1,y=3,rear=.12,nod=2,bell=.20},
  {y=2,nod=1,bell=-.10}
}
local peal={
  {y=1,bell=.12}, {x=1,y=-1,haunch=-2,bell=.42},
  {x=2,y=-2,haunch=-3,bell=.76,nod=1},
  {x=2,y=-3,haunch=-4,bell=1.05,nod=1,rear=.15},
  {x=-2,y=2,haunch=-1,bell=-1.04,nod=2,rear=.1},
  {x=-1,y=2,bell=-.69,nod=1},
  {y=1,bell=.50}, {y=1,bell=-.26}
}
local hit={
  {x=-1,nod=1}, {x=-3,y=1,nod=2,bow=.17,bell=-.50,rear=.32},
  {x=-2,y=2,nod=1,bell=.40,rear=.17}, {y=1,bell=-.19}
}
local death={
  {x=-1,rear=.3,bell=-.27}, {x=-2,y=2,nod=1,shut=true,rear=.2,bell=.43},
  {x=-2,y=6,nod=2,shut=true,fold=.38,tilt=-.1,bow=.35,loose={23,51,-.56}},
  {y=10,nod=3,shut=true,fold=.7,tilt=-.2,bow=.7,loose={18,55,-.86}},
  {y=13,nod=3,shut=true,fold=1,tilt=-.25,bow=1.06,loose={15,58,-1.30}},
  {y=12,nod=3,shut=true,fold=.87,tilt=-.22,bow=.94,loose={13,58,-1.62}},
  {y=13,nod=3,shut=true,fold=1,tilt=-.25,bow=1.06,loose={12,58,-1.48}},
  {y=13,nod=4,shut=true,fold=1,tilt=-.25,bow=1.10,loose={12,58,-1.50}}
}
local poses={idle=idle,attack=silk,special=peal,hit=hit,death=death}
local function draw(tag,i)
  if tag=="run" then
    return drawPose{step=i,y=({0,0,-1,-1,0,0,-1,-1})[i+1],bell=({-.18,-.1,0,.1,.18,.1,0,-.1})[i+1]}
  end
  local p=poses[tag][i+1]
  if p.loose then p.bell=p.loose[3] end
  local c=drawPose(p)
  if tag=="hit" and i==0 then return c:flash() end
  return c
end
L.DUR.idle={250,250,250,250,250,250,100,400}
L.DUR.run={75,75,75,75,75,75,75,75}
-- Four tells, two contact frames and two recovery frames per attack.
L.DUR.attack={275,275,275,275,150,150,200,200}
L.DUR.special=L.DUR.attack
local dir=here.."/../bosses"
return L.build("bell_widow",dir,draw,dir.."/bell_widow_review_x4.png")

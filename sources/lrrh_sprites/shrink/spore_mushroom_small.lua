-- spore_mushroom_small: the original spore mushroom (26 x 20 px) made about 20% smaller by deleting
-- repeated rows of the cap and columns either side of its centre; see shrink.lua.
-- The yellow eyes are guarded by colour.
local HERE = debug.getinfo(1, "S").source:match("^@(.*)/[^/]*$")
local S = dofile(HERE .. "/shrink.lua")
local pc = app.pixelColor
local function eye(c) return pc.rgbaA(c) > 0 and pc.rgbaR(c) > 200 and pc.rgbaG(c) > 140 and pc.rgbaB(c) < 110 end
return S.make("spore_mushroom", { guardColor = eye, guardWeight = 50, hair = 2, hairBand = 8, body = 2, head = 9, feet = 1,
  colBands = { { 0.04, 0.42, 3 }, { 0.58, 0.96, 2 } }, colShift = 2 }, rawget(_G, "REVIEW"))

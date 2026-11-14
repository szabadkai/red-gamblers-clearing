-- will_o_wisp_small: the original will-o'-wisp (28 x 29 px, as big as the ghost hunter) made about 20% smaller by
-- deleting repeated rows of the flame and columns either side of its face; see shrink.lua. Its cream face is guarded.
local HERE = debug.getinfo(1, "S").source:match("^@(.*)/[^/]*$")
local S = dofile(HERE .. "/shrink.lua")
local pc = app.pixelColor
local function face(c) return pc.rgbaA(c) > 0 and pc.rgbaR(c) > 200 and pc.rgbaG(c) > 200 and pc.rgbaB(c) > 160 end
return S.make("will_o_wisp", { guardColor = face, guardWeight = 20, hair = 3, hairBand = 9, body = 3, head = 12, feet = 1,
  colBands = { { 0.03, 0.3, 3 }, { 0.75, 0.97, 2 } }, colShift = 2 }, rawget(_G, "REVIEW"))

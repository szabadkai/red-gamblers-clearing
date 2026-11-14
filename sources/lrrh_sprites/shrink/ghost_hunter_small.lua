-- ghost_hunter_small: the original ghost hunter (30 x 30 px, the biggest sprite in the roster) made about
-- 20% smaller by deleting repeated rows (hood, cloak) and columns (the trailing cloak); see shrink.lua.
-- The yellow eyes are guarded by colour so the face keeps both of them.
local HERE = debug.getinfo(1, "S").source:match("^@(.*)/[^/]*$")
local S = dofile(HERE .. "/shrink.lua")
local pc = app.pixelColor
local function eye(c) return pc.rgbaA(c) > 0 and pc.rgbaR(c) > 200 and pc.rgbaG(c) > 140 and pc.rgbaB(c) < 110 end
-- lying on its side at the end of the death: cut columns instead of rows
local lying = {}
for f = 30, 34 do lying[f] = true end
return S.make("ghost_hunter", { guardColor = eye, guardWeight = 50, hair = 2, hairBand = 7, body = 4, head = 13, feet = 2,
  colBands = { { 0.03, 0.45, 4 }, { 0.5, 0.97, 2 } }, colShift = 3, lying = lying, lyingBand = { 0.05, 0.6 } }, rawget(_G, "REVIEW"))

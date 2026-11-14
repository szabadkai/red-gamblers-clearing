-- RED title wordmark: chunky letters from 2x2-pixel cells, shaded from one light (top-left), outlined, with an
-- ace of hearts tucked behind the D. Writes logo.aseprite and logo.png (84 x 36) next to this script.
local HERE = debug.getinfo(1, "S").source:match("^@(.*)/[^/]*$")
local W, H = 84, 36
local S = 3 -- pixels per letter cell
local pc = app.pixelColor
local C = {
  o = pc.rgba(27, 16, 20, 255),    -- outline
  r = pc.rgba(200, 69, 76, 255),   -- red
  d = pc.rgba(125, 47, 58, 255),   -- red shadow
  h = pc.rgba(240, 138, 126, 255), -- red light
  c = pc.rgba(243, 226, 184, 255), -- card
  s = pc.rgba(196, 170, 128, 255), -- card shadow
}
local LETTERS = {
  R = { "#####.", "##..##", "##..##", "#####.", "##.##.", "##..##", "##..##", "##..##" },
  E = { "######", "##....", "##....", "#####.", "##....", "##....", "##....", "######" },
  D = { "#####.", "##..##", "##..##", "##..##", "##..##", "##..##", "##..##", "#####." },
}
local grid = {}
local function set(x, y, v) if x >= 0 and y >= 0 and x < W and y < H then grid[y * W + x] = v end end
local function get(x, y) if x < 0 or y < 0 or x >= W or y >= H then return nil end return grid[y * W + x] end
-- card: cream, outlined, a heart in the corner that peeks out from behind the D
local cx, cy, cw, ch = 57, 1, 24, 32
for y = cy, cy + ch - 1 do for x = cx, cx + cw - 1 do
  local edge = x == cx or y == cy or x == cx + cw - 1 or y == cy + ch - 1
  set(x, y, edge and "o" or ((x == cx + cw - 2 or y == cy + ch - 2) and "s" or "c"))
end end
local HEART = { ".##.##.", "#######", "#######", ".#####.", "..###..", "...#..." }
for j, row in ipairs(HEART) do for i = 1, #row do if row:sub(i, i) == "#" then for dy = 0, 1 do for dx = 0, 1 do set(cx + 6 + i * 2 + dx, cy + 10 + j * 2 + dy, "r") end end end end end
local A = { ".#.", "#.#", "###", "#.#", "#.#" }
for j, row in ipairs(A) do for i = 1, #row do if row:sub(i, i) == "#" then set(cx + cw - 7 + i, cy + 2 + j, "r") end end end
-- letters: mark cells, then shade and outline
local letter = {}
local ox = 2
for _, name in ipairs({ "R", "E", "D" }) do
  for j, row in ipairs(LETTERS[name]) do for i = 1, #row do if row:sub(i, i) == "#" then
    for dy = 0, S - 1 do for dx = 0, S - 1 do letter[(9 + (j - 1) * S + dy) * W + ox + (i - 1) * S + dx] = true end end
  end end end
  ox = ox + 6 * S + 3
end
local function isL(x, y) return x >= 0 and y >= 0 and x < W and y < H and letter[y * W + x] end
for y = 0, H - 1 do for x = 0, W - 1 do
  if isL(x, y) then
    set(x, y, (not isL(x, y - 1) or not isL(x - 1, y)) and "h" or ((not isL(x, y + 1) or not isL(x + 1, y)) and "d" or "r"))
  else
    for dy = -1, 1 do for dx = -1, 1 do if isL(x + dx, y + dy) then set(x, y, "o") end end end
  end
end end
-- a 1 px drop shadow under the letters (down-right) where nothing else is drawn
for y = H - 1, 1, -1 do for x = W - 1, 1, -1 do
  if get(x, y) == nil and get(x - 1, y - 1) == "o" and isL(x - 2, y - 2) == nil then set(x, y, "o") end
end end
local img = Image(W, H, ColorMode.RGB)
for y = 0, H - 1 do for x = 0, W - 1 do local v = get(x, y); if v then img:drawPixel(x, y, C[v]) end end end
local spr = Sprite(W, H, ColorMode.RGB)
spr.cels[1].image = img
spr:saveAs(HERE .. "/logo.aseprite")
spr:saveCopyAs(HERE .. "/logo.png")
local big = Sprite(spr); big:resize(W * 8, H * 8); big:saveCopyAs(HERE .. "/logo_x8.png"); big:close()
spr:close()
return "ok"

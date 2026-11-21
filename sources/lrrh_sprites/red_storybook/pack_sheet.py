"""Build the Storybook runtime atlas with Pillow: python pack_sheet.py.

Source-space anatomical pivots preserve body motion instead of centering each
changing silhouette (especially sword FX). Generated source sheets stay intact.
"""
from pathlib import Path
from PIL import Image
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
CELL, PIVOT = 64, (32, 54)
atlas = Image.new('RGBA', (CELL * 8, CELL * 16))

def pack(name, rows, start, scale, pivots, custom=None):
    source = Image.open(HERE / name).convert('RGBA')
    for row in range(rows):
        for col in range(8):
            origin = (round(col * source.width / 8), round(row * source.height / rows))
            bounds = (origin[0], origin[1], round((col + 1) * source.width / 8), round((row + 1) * source.height / rows))
            bounds = (custom or {}).get((row, col), bounds)
            pose = source.crop(bounds)
            pose.putalpha(pose.getchannel('A').point(lambda a: 255 if a >= 200 else 0))
            px, py = pivots[row][col]
            px += origin[0] - bounds[0]
            py += origin[1] - bounds[1]
            pose = pose.resize((round(pose.width * scale), round(pose.height * scale)), Image.Resampling.NEAREST)
            box = pose.getbbox()
            assert box, (name, row, col)
            x, y = PIVOT[0] - round(px * scale) + box[0], PIVOT[1] - round(py * scale) + box[1]
            pose = pose.crop(box)
            assert x >= 1 and y >= 1 and x + pose.width < CELL and y + pose.height < CELL, (name,row,col)
            index = start + row * 8 + col
            atlas.alpha_composite(pose, ((index % 8) * CELL + x, (index // 8) * CELL + y))

old_y = [139,138,147,138,138,139,139,140]
pack('red_storybook_sheet.png', 8, 0, .2, [[(106,y)]*8 for y in old_y])
motion_x = [
    [150,145,144,147,144,140,133,130],
    [119,127,130,139,143,148,138,138],
    [147,156,155,143,139,133,133,135],
    [132,127,111,96,103,128,135,135],
]
motion_y = [[199]*8, [195,195,195,195,195,203,220,219], [197,197,197,197,207,198,196,192], [192]*8]
pack('movement_v2.png', 4, 64, .15, [list(zip(xs,ys)) for xs,ys in zip(motion_x,motion_y)])
combat_x = [[115,115,113,122,123,118,119,119], [124,122,113,110,109,117,117,119], [115,117,112,110,115,133,127,119], [115]*8]
combat_y = [[185]*8, [203,198,198,198,198,198,198,198], [193]*8, [188]*8]
# Preserve the full horizontal slash crossing its nominal cell, and exclude its
# spill from the adjacent recovery poses.
combat_bounds = {(0,2):(443,0,692,222), (0,3):(692,0,921,222), (0,4):(921,0,1109,222)}
pack('combat_v2.png', 4, 96, .19, [list(zip(xs,ys)) for xs,ys in zip(combat_x,combat_y)], combat_bounds)
destination = ROOT / 'poker-web/assets/storybook/red.png'
atlas.save(destination)
print(f'Packed 128 poses: {destination}; 64px cells, pivot {PIVOT}.')

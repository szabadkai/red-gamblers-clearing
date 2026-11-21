"""Pack the generated poses onto a fixed pixel grid. Requires Pillow.

Run from any directory: python pack_sheet.py
The high-resolution source stays unchanged; only the runtime copy is resampled.
"""
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
source = Image.open(HERE / 'red_storybook_sheet.png').convert('RGBA')
atlas = Image.new('RGBA', (320, 320))
cell, scale = 40, .2
baselines = [139, 138, None, 138, 138, 139, 139, 140]
for row in range(8):
    for col in range(8):
        bounds = (round(col * source.width / 8), round(row * source.height / 8),
                  round((col + 1) * source.width / 8), round((row + 1) * source.height / 8))
        pose = source.crop(bounds)
        # Discard the generated translucent matte, preserving the solid silhouette.
        pose.putalpha(pose.getchannel('A').point(lambda a: 255 if a >= 200 else 0))
        bbox = pose.getbbox()
        assert bbox, (row, col)
        # Air poses use the sole as pivot: physics supplies their vertical motion.
        baseline = bbox[3] if row == 2 else baselines[row]
        pose = pose.resize((round(pose.width * scale), round(pose.height * scale)), Image.Resampling.NEAREST)
        x, y = 24 - round(106 * scale), 34 - round(baseline * scale)
        trimmed = pose.getbbox()
        pose = pose.crop(trimmed)
        x, y = x + trimmed[0], y + trimmed[1]
        assert x >= 0 and y >= 0 and x + pose.width <= cell and y + pose.height <= cell
        atlas.alpha_composite(pose, (col * cell + x, row * cell + y))

destination = ROOT / 'poker-web/assets/storybook'
destination.mkdir(parents=True, exist_ok=True)
atlas.save(destination / 'red.png')
print(f'Packed 64 poses into {destination / "red.png"}; pivot (24, 34), 40px cells.')

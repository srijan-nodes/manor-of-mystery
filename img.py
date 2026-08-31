from PIL import Image
import numpy as np

# ==== CONFIG ====
INPUT_IMAGE = "WIN_20231207_08_19_14_Pro.jpg"
OUTPUT_SVG = "output.svg"

TEXT = "srijan das"
FONT_SIZE = 6
TARGET_WIDTH = 400  # controls resolution (push carefully)

# ==== LOAD IMAGE ====
img = Image.open(INPUT_IMAGE).convert("L")

# Maintain aspect ratio
aspect_ratio = img.height / img.width
target_height = int(TARGET_WIDTH * aspect_ratio)

img = img.resize((TARGET_WIDTH, target_height))
pixels = np.array(img)

# ==== SVG HEADER ====
svg_width = TARGET_WIDTH * FONT_SIZE
svg_height = target_height * FONT_SIZE

svg = []
svg.append(f'<svg xmlns="http://www.w3.org/2000/svg" '
           f'width="{svg_width}" height="{svg_height}">')

svg.append(f'<rect width="100%" height="100%" fill="white"/>')

# ==== RENDER ====
for y in range(target_height):
    for x in range(TARGET_WIDTH):
        brightness = pixels[y, x]  # 0–255

        # Full grayscale mapping
        gray = brightness
        fill = f"rgb({gray},{gray},{gray})"

        # Optional: opacity mapping (adds depth)
        opacity = brightness / 255

        svg.append(
            f'<text x="{x * FONT_SIZE}" y="{(y + 1) * FONT_SIZE}" '
            f'font-size="{FONT_SIZE}" '
            f'fill="{fill}" fill-opacity="{opacity}" '
            f'font-family="monospace">{TEXT}</text>'
        )

# ==== CLOSE SVG ====
svg.append("</svg>")

# ==== SAVE ====
with open(OUTPUT_SVG, "w", encoding="utf-8") as f:
    f.write("\n".join(svg))

print("SVG generated.")
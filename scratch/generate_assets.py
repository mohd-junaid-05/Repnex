import os
from PIL import Image, ImageDraw, ImageFont
import numpy as np

src_path = 'docs/logo/repnex-logo.png'
if not os.path.exists(src_path):
    src_path = 'C:/Users/Hp/.gemini/antigravity/brain/c5804a9b-c629-42fc-8a9e-434fa678d279/.user_uploaded/media_1794385436091_6e484925.png'

print(f"Loading master logo from {src_path}...")
im = Image.open(src_path).convert('RGBA')
arr = np.array(im)
alpha = arr[:, :, 3]

# Find content bounds (alpha > 15)
coords = np.argwhere(alpha > 15)
ymin, xmin = coords.min(axis=0)
ymax, xmax = coords.max(axis=0)

w = xmax - xmin + 1
h = ymax - ymin + 1
size = max(w, h)

# Standard padding ratio (8% gives optimal tab and icon framing)
pad = int(size * 0.08)
target_size = size + 2 * pad

master = Image.new('RGBA', (target_size, target_size), (0, 0, 0, 0))
crop = im.crop((xmin, ymin, xmax + 1, ymax + 1))
offset_x = pad + (size - w) // 2
offset_y = pad + (size - h) // 2
master.paste(crop, (offset_x, offset_y), crop)

# 1. High-res logo
master_1024 = master.resize((1024, 1024), Image.Resampling.LANCZOS)
master_1024.save('public/logo.png', format='PNG')
print("Saved public/logo.png (1024x1024)")

# 2. PWA & Mobile icons
master_512 = master.resize((512, 512), Image.Resampling.LANCZOS)
master_512.save('public/icon-512.png', format='PNG')
print("Saved public/icon-512.png")

master_192 = master.resize((192, 192), Image.Resampling.LANCZOS)
master_192.save('public/icon-192.png', format='PNG')
print("Saved public/icon-192.png")

master_180 = master.resize((180, 180), Image.Resampling.LANCZOS)
master_180.save('public/apple-touch-icon.png', format='PNG')
master_180.save('app/apple-icon.png', format='PNG')
print("Saved apple-touch-icon.png and app/apple-icon.png (180x180)")

master_32 = master.resize((32, 32), Image.Resampling.LANCZOS)
master_32.save('public/icon.png', format='PNG')
master_32.save('app/icon.png', format='PNG')
print("Saved icon.png (32x32)")

# 3. Multi-resolution Favicon ICO
ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
master.save('public/favicon.ico', format='ICO', sizes=ico_sizes)
master.save('app/favicon.ico', format='ICO', sizes=ico_sizes)
print("Saved public/favicon.ico and app/favicon.ico")

# 4. Logo with text "Repnex" on the right side
# Let's create high-res transparent banner: 800 x 200
font_path_bold = 'C:/Windows/Fonts/segoeuib.ttf'
if not os.path.exists(font_path_bold):
    font_path_bold = 'C:/Windows/Fonts/arialbd.ttf'

font_bold_72 = ImageFont.truetype(font_path_bold, 84)
font_regular_28 = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 24)

logo_w_text = Image.new('RGBA', (800, 200), (0, 0, 0, 0))
mark_160 = master.resize((160, 160), Image.Resampling.LANCZOS)
logo_w_text.paste(mark_160, (20, 20), mark_160)

draw_lwt = ImageDraw.Draw(logo_w_text)
# Draw "Repnex" text on right side
draw_lwt.text((205, 52), "Repnex", fill=(244, 244, 245, 255), font=font_bold_72)
logo_w_text.save('public/logo-with-text.png', format='PNG')

# Also create dark-text version for light themes if needed
logo_w_text_dark = Image.new('RGBA', (800, 200), (0, 0, 0, 0))
logo_w_text_dark.paste(mark_160, (20, 20), mark_160)
draw_lwtd = ImageDraw.Draw(logo_w_text_dark)
draw_lwtd.text((205, 52), "Repnex", fill=(24, 24, 27, 255), font=font_bold_72)
logo_w_text_dark.save('public/logo-with-text-dark.png', format='PNG')
print("Saved public/logo-with-text.png and dark variant")

# 5. OpenGraph Social Share Card (1200 x 630)
og = Image.new('RGBA', (1200, 630), (9, 9, 11, 255)) # Zinc-950
og_draw = ImageDraw.Draw(og)

# Background subtle graph grid lines
for gx in range(0, 1200, 60):
    og_draw.line([(gx, 0), (gx, 630)], fill=(24, 24, 27, 80), width=1)
for gy in range(0, 630, 60):
    og_draw.line([(0, gy), (1200, gy)], fill=(24, 24, 27, 80), width=1)

# Subtle decorative node connections in background
bg_nodes = [(1050, 120), (1120, 220), (980, 260), (1060, 380), (1150, 480)]
for i in range(len(bg_nodes) - 1):
    og_draw.line([bg_nodes[i], bg_nodes[i+1]], fill=(39, 39, 42, 120), width=2)
for nx, ny in bg_nodes:
    og_draw.rounded_rectangle([nx-12, ny-12, nx+12, ny+12], radius=4, fill=(39, 39, 42, 180))

# Left side card badge carrying the logo
# A sleek dark card container with border
card_x, card_y, card_w, card_h = 80, 175, 260, 260
og_draw.rounded_rectangle(
    [card_x, card_y, card_x + card_w, card_y + card_h],
    radius=24,
    fill=(18, 18, 22, 255),
    outline=(39, 39, 42, 255),
    width=2
)

# Put high-res mark inside card
mark_card = master.resize((210, 210), Image.Resampling.LANCZOS)
# Make white nodes for contrast in dark OG banner if desired, or let the original mark shine with subtle backlight
# Create a bright white/silver copy of mark for dark background card
mark_arr = np.array(mark_card)
# Let's adjust colors for dark card: dark pixels ([28, 28, 29]) -> silver/white [244, 244, 245], grey remains [113, 113, 122]
mark_dark_card = mark_arr.copy()
is_dark = (mark_arr[:, :, 3] > 100) & (mark_arr[:, :, 0] < 60)
mark_dark_card[is_dark, 0] = 244
mark_dark_card[is_dark, 1] = 244
mark_dark_card[is_dark, 2] = 245
mark_card_bright = Image.fromarray(mark_dark_card)
og.paste(mark_card_bright, (card_x + 25, card_y + 25), mark_card_bright)

# Right side: App Name Repnex and descriptive typography
font_title = ImageFont.truetype(font_path_bold, 92)
font_subtitle = ImageFont.truetype(font_path_bold, 36)
font_body = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 24)
font_badge = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 18)

text_x = 380

# Overline pill
og_draw.rounded_rectangle([text_x, 150, text_x + 290, 186], radius=8, fill=(24, 24, 27, 255), outline=(63, 63, 70, 255), width=1)
og_draw.text((text_x + 14, 156), "AST ARCHITECTURE MAPPER", fill=(161, 161, 170, 255), font=font_badge)

# Brand name Repnex on right side of logo
og_draw.text((text_x, 202), "Repnex", fill=(255, 255, 255, 255), font=font_title)

# Subtitle
og_draw.text((text_x, 310), "Codebase Architecture & Dependency Graph", fill=(212, 212, 216, 255), font=font_subtitle)

# Description text
og_draw.text((text_x, 365), "Interactive AST-parsed dependency maps for TypeScript & JavaScript.", fill=(161, 161, 170, 255), font=font_body)
og_draw.text((text_x, 400), "Every box and line comes from real parsed code. Zero hallucinated edges.", fill=(113, 113, 122, 255), font=font_body)

# Feature Badges
badges = ["Real AST Parsing", "Folded Hierarchies", "Blast Radius Analysis", "LangSmith Traced"]
badge_x = text_x
for b in badges:
    bbox = font_badge.getbbox(b)
    bw = bbox[2] - bbox[0] + 24
    og_draw.rounded_rectangle([badge_x, 455, badge_x + bw, 490], radius=6, fill=(24, 24, 27, 255), outline=(39, 39, 42, 255), width=1)
    og_draw.text((badge_x + 12, 462), b, fill=(212, 212, 216, 255), font=font_badge)
    badge_x += bw + 12

og.save('public/og.png', format='PNG')
print("Saved public/og.png (1200x630 OpenGraph card)")

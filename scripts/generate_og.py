"""Generate Open Graph image (1200x630) for katalog-firm.ch in Hays style.

Output: frontend/public/og.png

Style match: like praca-w-szwajcarii.ch og.png — navy background, dot pattern,
top-left brand row (logo + name + url), big two-line headline (white + red).
"""
from __future__ import annotations
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "scripts", "og-assets")
LOGO = os.path.join(ROOT, "frontend", "public", "logo.png")
OUT = os.path.join(ROOT, "frontend", "public", "og.png")

W, H = 1200, 630
# Match praca-w-szwajcarii og-1-classic — darker slate-900 (#0F172A),
# not the hero navy (#0D2240). Sampled from prod OG.
NAVY = (15, 23, 42, 255)            # #0F172A (slate-900)
RED = (225, 0, 42, 255)             # #E1002A
WHITE = (255, 255, 255, 255)
DIM = (255, 255, 255, 35)           # very subtle dot pattern
SUBTLE = (255, 255, 255, 140)       # subtitle / tagline

ROBOTO_SLAB_BOLD = os.path.join(ASSETS, "RobotoSlab-Bold.ttf")
ROBOTO = os.path.join(ASSETS, "Roboto-Regular.ttf")

# Praca-w-szwajcarii uses Arial family (matches their prod og-1-classic.png)
FONT_BLACK = r"C:\Windows\Fonts\ariblk.ttf"
FONT_BOLD = r"C:\Windows\Fonts\arialbd.ttf"
FONT_REG = r"C:\Windows\Fonts\arial.ttf"


def load_font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def draw_dot_pattern(img: Image.Image) -> None:
    """Light diagonal dot pattern overlay — taki sam feel jak hays-pattern."""
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    step = 40
    for y in range(0, H, step):
        for x in range(0, W, step):
            # Stagger every other row for diagonal feel
            xx = x + (step // 2 if (y // step) % 2 else 0)
            d.ellipse((xx, y, xx + 2, y + 2), fill=DIM)
    img.alpha_composite(overlay)


def draw_red_glow(img: Image.Image) -> None:
    """Very subtle red radial glow in top-right corner — barely visible."""
    glow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(glow)
    cx, cy = W - 80, 80
    # Tighter + much fainter than before — don't bleed across the image
    for r in range(220, 30, -6):
        alpha = max(0, int(18 * (1 - (r - 30) / 190)))
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(225, 0, 42, alpha))
    img.alpha_composite(glow)


def main() -> None:
    """
    Layout 1:1 jak praca-w-szwajcarii og-1-classic.png:
    - logo 110px at (75, 60)
    - brand "Katalog Firm" at (200, 88) — Arial Bold 28
    - url at (202, 128) — Arial Regular 20 (#94A3B8)
    - headline "Polskie firmy" (white) at (80, 240) — Arial Black 130
    - headline "w Szwajcarii" (red #DC2626) at (80, 380) — Arial Black 130
    - tagline at (80, 560) — Arial Regular 26 (#94A3B8)
    """
    img = Image.new("RGBA", (W, H), NAVY)
    draw_dot_pattern(img)
    draw_red_glow(img)
    d = ImageDraw.Draw(img)

    # --- Brand row top-left ---
    logo = Image.open(LOGO).convert("RGBA")
    logo_box = 110
    lw, lh = logo.size
    if lw > lh:
        new_w, new_h = logo_box, int(logo_box * lh / lw)
    else:
        new_w, new_h = int(logo_box * lw / lh), logo_box
    logo = logo.resize((new_w, new_h), Image.LANCZOS)
    cx = 75 + (logo_box - new_w) // 2
    cy = 60 + (logo_box - new_h) // 2
    img.paste(logo, (cx, cy), logo)

    f_brand = load_font(FONT_BOLD, 28)
    d.text((200, 88), "Katalog Firm", fill=WHITE, font=f_brand)
    f_url = load_font(FONT_REG, 20)
    d.text((202, 128), "katalog-firm.ch", fill=(148, 163, 184), font=f_url)

    # --- HUGE headline (two lines) ---
    f_headline = load_font(FONT_BLACK, 130)
    d.text((80, 240), "Polskie firmy", fill=WHITE, font=f_headline)
    d.text((80, 380), "w Szwajcarii", fill=(220, 38, 38), font=f_headline)

    # --- Tagline bottom ---
    f_tag = load_font(FONT_REG, 26)
    d.text((80, 560), "120+ sprawdzonych firm — dodaj swoją za darmo.",
           fill=(148, 163, 184), font=f_tag)

    # Convert to RGB (no alpha needed in final OG)
    final = Image.new("RGB", (W, H), (15, 23, 42))
    final.paste(img, (0, 0), img)

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    final.save(OUT, "PNG", optimize=True)
    print(f"Saved: {OUT}  ({os.path.getsize(OUT)} bytes)")


if __name__ == "__main__":
    main()

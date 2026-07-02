#!/usr/bin/env python3
"""Generate vector SVG wedding logo variants from the logo sheet design."""

from pathlib import Path
from typing import Optional

OUT = Path(__file__).parent
W, H = 384, 512
SAGE = "#8B9784"
CREAM = "#EAE4DC"

FONTS = """
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap');
  @import url('https://fonts.cdnfonts.com/css/miama-nueva');
  .serif { font-family: 'Cormorant Garamond', Georgia, serif; }
  .script { font-family: 'Miama Nueva', 'Segoe Script', cursive; }
"""

BRANCH_WEAVE = (
    "M 54 322 C 70 302, 90 280, 112 258 C 134 236, 158 214, 184 194 "
    "C 204 178, 226 164, 250 152 C 270 142, 290 134, 310 128 "
    "M 112 258 C 122 246, 132 232, 140 218 M 158 214 C 168 204, 178 192, 186 180 "
    "M 184 194 C 194 186, 204 178, 214 170 M 250 152 C 260 144, 270 136, 280 128 "
    "M 90 280 C 98 268, 106 256, 112 244"
)

BRANCH_PAIR = (
    "M 116 172 C 106 184, 98 196, 92 208 C 86 220, 82 232, 80 244 "
    "M 98 196 C 104 192, 110 186, 116 180 M 104 186 C 98 180, 92 174, 86 168 "
    "M 268 172 C 278 184, 286 196, 292 208 C 298 220, 302 232, 304 244 "
    "M 292 208 C 286 204, 280 198, 274 192 M 286 196 C 292 190, 298 184, 304 178"
)

BRANCH_HORIZONTAL = (
    "M 48 156 C 68 152, 88 150, 108 152 C 128 154, 148 158, 168 162 "
    "C 188 166, 208 170, 228 172 C 248 174, 268 172, 288 166 "
    "M 108 152 C 114 142, 120 132, 126 122 M 168 162 C 174 152, 180 142, 186 132 "
    "M 228 172 C 234 162, 240 152, 246 142 M 88 150 C 82 140, 76 130, 70 120 "
    "M 248 174 C 254 164, 260 154, 266 144"
)

BRANCH_SIDE = (
    "M 272 112 C 276 134, 278 156, 276 178 C 274 200, 270 222, 264 244 "
    "C 258 266, 250 286, 240 304 C 230 322, 218 338, 204 352 "
    "M 276 178 C 282 176, 288 174, 294 172 M 264 244 C 270 242, 276 240, 282 238 "
    "M 250 286 C 256 284, 262 282, 268 280"
)

BRANCH_SMALL = (
    "M 186 122 C 190 128, 194 134, 198 140 C 202 146, 206 152, 210 158"
)

BRANCH_TOP = (
    "M 164 122 C 176 112, 188 106, 200 102 C 212 98, 224 98, 236 102 "
    "C 248 106, 258 114, 266 124 M 200 102 C 204 94, 208 86, 212 78 "
    "M 224 98 C 228 90, 232 82, 236 74 M 236 102 C 240 94, 244 86, 248 78"
)

BRANCH_CORNER = (
    "M 226 202 C 236 196, 246 192, 256 190 C 266 188, 276 190, 284 196 "
    "M 246 192 C 250 186, 254 180, 258 174 M 256 190 C 260 184, 264 178, 268 172"
)

BRANCH_SEAL = (
    "M 150 210 C 160 206, 170 204, 180 204 C 190 204, 200 206, 210 210 "
    "M 170 204 C 174 198, 178 192, 182 186 M 180 204 C 184 198, 188 192, 192 186"
)


def scalloped_circle(cx: float, cy: float, r: float, lobes: int = 24) -> str:
    import math

    pts = []
    for i in range(lobes * 2):
        angle = (math.pi * 2 * i) / (lobes * 2)
        radius = r + (5 if i % 2 else 0)
        x = cx + math.cos(angle) * radius
        y = cy + math.sin(angle) * radius
        pts.append((x, y))
    d = f"M {pts[0][0]:.1f} {pts[0][1]:.1f}"
    for x, y in pts[1:]:
        d += f" L {x:.1f} {y:.1f}"
    d += " Z"
    return d


def svg_open(bg: Optional[str], fg: str) -> str:
    bg_rect = f'<rect width="{W}" height="{H}" fill="{bg}"/>' if bg else ""
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" '
        'role="img" aria-label="Логотип Александр и Александра">\n'
        f"<defs><style>{FONTS}</style></defs>\n"
        f'<g fill="{fg}" stroke="{fg}" stroke-linecap="round" stroke-linejoin="round">\n'
        f"{bg_rect}\n"
    )


def svg_close() -> str:
    return "</g>\n</svg>\n"


def names_block(y_start: float, fg: str, size: float = 22, gap: float = 30) -> str:
    return (
        f'<text class="serif" x="{W/2}" y="{y_start}" text-anchor="middle" '
        f'font-size="{size}" letter-spacing="0.12em" fill="{fg}">Александр</text>\n'
        f'<text class="script" x="{W/2}" y="{y_start + gap}" text-anchor="middle" '
        f'font-size="{size * 0.85}" fill="{fg}">и</text>\n'
        f'<text class="serif" x="{W/2}" y="{y_start + gap * 2}" text-anchor="middle" '
        f'font-size="{size}" letter-spacing="0.12em" fill="{fg}">Александра</text>\n'
    )


def mono_a(x: float, y: float, size: float, fg: str, weight: str = "500") -> str:
    return (
        f'<text class="serif" x="{x}" y="{y}" text-anchor="middle" '
        f'font-size="{size}" font-weight="{weight}" fill="{fg}">A</text>\n'
    )


def line_art(path: str, width: float = 1.2, fill: str = "none") -> str:
    return f'<path d="{path}" fill="{fill}" stroke-width="{width}"/>\n'


def build_logo(bg: Optional[str], fg: str, builder) -> str:
    return builder(bg, fg)


def logo_1(bg, fg):
    s = svg_open(bg, fg)
    s += mono_a(148, 212, 118, fg)
    s += mono_a(236, 250, 118, fg)
    s += line_art(BRANCH_WEAVE, 1.15)
    return s + svg_close()


def logo_2(bg, fg):
    s = svg_open(bg, fg)
    s += mono_a(148, 170, 96, fg)
    s += mono_a(236, 170, 96, fg)
    s += f'<line x1="{W/2}" y1="90" x2="{W/2}" y2="190" stroke-width="1" fill="none"/>\n'
    s += line_art(BRANCH_PAIR, 1.1)
    s += names_block(270, fg, 20, 28)
    return s + svg_close()


def logo_3(bg, fg):
    s = svg_open(bg, fg)
    s += mono_a(128, 160, 88, fg)
    s += (
        f'<text class="script" x="{W/2}" y="160" text-anchor="middle" '
        f'font-size="52" fill="{fg}">&amp;</text>\n'
    )
    s += mono_a(256, 160, 88, fg)
    s += line_art(BRANCH_HORIZONTAL, 1.1)
    s += names_block(270, fg, 20, 28)
    return s + svg_close()


def logo_4(bg, fg):
    s = svg_open(bg, fg)
    s += (
        f'<ellipse cx="{W/2}" cy="248" rx="118" ry="198" fill="none" stroke-width="1.1"/>\n'
        f'<ellipse cx="{W/2}" cy="248" rx="112" ry="192" fill="none" stroke-width="0.8"/>\n'
    )
    s += line_art(BRANCH_SIDE, 1.0)
    s += mono_a(158, 190, 72, fg)
    s += mono_a(226, 190, 72, fg)
    s += f'<line x1="{W/2}" y1="120" x2="{W/2}" y2="210" stroke-width="0.9" fill="none"/>\n'
    s += line_art(BRANCH_SMALL, 1.0)
    s += names_block(320, fg, 18, 26)
    return s + svg_close()


def logo_5(bg, fg):
    cx, cy, r = W / 2, 230, 148
    s = svg_open(bg, fg)
    s += (
        f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke-width="1.2"/>\n'
        f'<circle cx="{cx}" cy="{cy}" r="{r - 6}" fill="none" stroke-width="0.8"/>\n'
    )
    s += mono_a(158, 220, 64, fg)
    s += mono_a(226, 220, 64, fg)
    s += f'<line x1="{cx}" y1="160" x2="{cx}" y2="240" stroke-width="0.9" fill="none"/>\n'
    s += line_art(BRANCH_SEAL, 1.0)
    s += (
        f'<path id="topArc" d="M {cx - 108} {cy - 18} A {r - 36} {r - 36} 0 0 1 {cx + 108} {cy - 18}" fill="none"/>\n'
        f'<text class="serif" font-size="17" letter-spacing="0.14em" fill="{fg}">\n'
        f'  <textPath href="#topArc" startOffset="50%" text-anchor="middle">Александр</textPath>\n'
        f"</text>\n"
        f'<path id="botArc" d="M {cx + 108} {cy + 54} A {r - 36} {r - 36} 0 0 1 {cx - 108} {cy + 54}" fill="none"/>\n'
        f'<text class="serif" font-size="17" letter-spacing="0.14em" fill="{fg}">\n'
        f'  <textPath href="#botArc" startOffset="50%" text-anchor="middle">Александра</textPath>\n'
        f"</text>\n"
        f'<circle cx="{cx - 108}" cy="{cy + 18}" r="2.2" fill="{fg}" stroke="none"/>\n'
        f'<circle cx="{cx + 108}" cy="{cy + 18}" r="2.2" fill="{fg}" stroke="none"/>\n'
    )
    return s + svg_close()


def logo_6(bg, fg):
    s = svg_open(bg, fg)
    s += mono_a(148, 190, 104, fg)
    s += mono_a(236, 226, 104, fg)
    s += line_art(BRANCH_CORNER, 1.1)
    s += names_block(320, fg, 20, 28)
    return s + svg_close()


def logo_7(bg, fg):
    cx, cy, r = W / 2, 248, 138
    s = svg_open(bg, fg)
    s += f'<path d="{scalloped_circle(cx, cy, r)}" fill="none" stroke-width="1.1"/>\n'
    s += f'<circle cx="{cx}" cy="{cy}" r="{r - 18}" fill="none" stroke-width="0.9"/>\n'
    s += mono_a(cx, cy - 26, 58, fg)
    s += mono_a(cx, cy + 54, 58, fg)
    s += (
        f'<line x1="{cx - 52}" y1="{cy + 14}" x2="{cx + 52}" y2="{cy + 14}" '
        f'stroke-width="0.9" fill="none"/>\n'
    )
    s += line_art(
        "M 210 262 C 218 256, 226 250, 234 244 C 242 238, 250 234, 258 230 "
        "M 226 250 C 230 244, 234 238, 238 232",
        1.0,
    )
    return s + svg_close()


def logo_8(bg, fg):
    s = svg_open(bg, fg)
    s += line_art(BRANCH_TOP, 1.1)
    s += (
        f'<line x1="108" y1="140" x2="168" y2="140" stroke-width="0.8" fill="none"/>\n'
        f'<line x1="216" y1="140" x2="276" y2="140" stroke-width="0.8" fill="none"/>\n'
        f'<circle cx="192" cy="140" r="2.5" fill="{fg}" stroke="none"/>\n'
    )
    s += names_block(230, fg, 22, 30)
    s += (
        f'<line x1="128" y1="350" x2="256" y2="350" stroke-width="0.8" fill="none"/>\n'
        f'<circle cx="184" cy="350" r="2" fill="{fg}" stroke="none"/>\n'
        f'<circle cx="192" cy="350" r="3" fill="{fg}" stroke="none"/>\n'
        f'<circle cx="200" cy="350" r="2" fill="{fg}" stroke="none"/>\n'
    )
    return s + svg_close()


LOGOS = [
    ("logo-01-monogram-weave", logo_1, SAGE, CREAM),
    ("logo-02-monogram-divided", logo_2, SAGE, CREAM),
    ("logo-03-monogram-ampersand", logo_3, SAGE, CREAM),
    ("logo-04-monogram-oval", logo_4, SAGE, CREAM),
    ("logo-05-seal-circle", logo_5, CREAM, SAGE),
    ("logo-06-monogram-offset", logo_6, CREAM, SAGE),
    ("logo-07-seal-wax", logo_7, CREAM, SAGE),
    ("logo-08-names-minimal", logo_8, CREAM, SAGE),
]


def main() -> None:
    for slug, builder, bg_color, fg_color in LOGOS:
        full = OUT / f"{slug}.svg"
        transparent = OUT / f"{slug}-transparent.svg"
        full.write_text(builder(bg_color, fg_color), encoding="utf-8")
        transparent.write_text(builder(None, fg_color), encoding="utf-8")
        print(f"Wrote {full.name}, {transparent.name}")


if __name__ == "__main__":
    main()

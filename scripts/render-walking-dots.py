"""Generate the portfolio's original monochrome hero loop (requires Pillow)."""
from math import cos, pi
from pathlib import Path

from PIL import Image, ImageDraw

W, H, STEP = 480, 320, 20
PALETTE = [0x17, 0x27, 0x39, 0x54, 0x79, 0x9A, 0xBC, 0xF5]


def circuit(x, y, w, h):
    return ([(x+i, y) for i in range(w)] + [(x+w, y+i) for i in range(h)] +
            [(x+w-i, y+h) for i in range(w)] + [(x, y+h-i) for i in range(h)])


# Three offset rectangular orbital tracks, one circuit per clip.
TRACKS = [circuit(3, 3, 15, 9), circuit(6, 5, 14, 6), circuit(8, 6, 8, 6)]


def frame(t):
    img = Image.new('P', (W, H))
    img.putpalette([component for gray in PALETTE for component in (gray, gray, min(gray, 0xF0))] + [0] * (768 - 3 * len(PALETTE)))
    d = ImageDraw.Draw(img)
    for y in range(1, 15):
        for x in range(1, 23):
            i, j = x * STEP + 10, y * STEP + 10
            d.point((i, j), fill=1 if x < 3 or x > 20 or y < 3 or y > 13 else 2)
    for k, track in enumerate(TRACKS):
        for x, y in track:
            i, j = x * STEP + 10, y * STEP + 10
            d.rectangle((i, j, i + 1, j + 1), fill=3 if k == 0 else 2)
        for n in range(k + 3):
            for lag in range(4, -1, -1):
                direction = -1 if k == 1 else 1
                step = (direction * t + n / (k + 3) + k / 9) * len(track) - lag * direction * .72
                index = int(step // 1)
                x, y = track[index % len(track)]
                nx, ny = track[(index + 1) % len(track)]
                f = (1 - cos(pi * (step - index))) / 2
                i, j = round((x + (nx - x) * f) * STEP + 10), round((y + (ny - y) * f) * STEP + 10)
                rad = [4, 2, 2, 1, 1][lag]
                d.ellipse((i-rad,j-rad,i+rad,j+rad), fill=[7-k,5,4,3,2][lag])
    return img


if __name__ == '__main__':
    target = Path(__file__).resolve().parents[1] / 'public' / 'art'
    target.mkdir(parents=True, exist_ok=True)
    frames = [frame(i / 128) for i in range(128)]
    frames[0].save(target / 'walking-dots.png', optimize=True)
    frames[0].save(target / 'walking-dots.gif', save_all=True, append_images=frames[1:], duration=50, loop=0, optimize=True)

"""Record a looping hero animation of the trainer for the README.

Drives the app in headless Chromium through a two-act demo (Book pacer
playback -> switch to RSVP dark stage with ORP flashing -> speed bump),
captures a screenshot per frame, and assembles them into a looping animated
WebP with Pillow. A synthetic cursor is injected into the page (Playwright
never renders the OS pointer) and moved in lockstep with the real mouse.

No ffmpeg required -- Pillow writes the animated .webp directly.

Usage:
    pip install pillow playwright && playwright install chromium
    # terminal 1: npm run dev
    # terminal 2:
    python scripts/make_hero.py http://localhost:5173/speed-reading-trainer/ assets/hero.webp
"""
import sys
import time
from io import BytesIO
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

W, H = 1100, 640           # capture viewport (tight crop: less empty parchment)
OUT_W = 880                # downscale width for the final webp
FPS_MS = 55                # per-frame duration for cursor-motion beats
HOLD_MS = 750              # lingering pause at a settled state

# A classic arrow pointer as an inline SVG, tip at (0,0).
CURSOR_SVG = (
    "data:image/svg+xml;utf8,"
    "<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'>"
    "<path d='M2 2 L2 22 L8 16 L12 25 L16 23 L12 14 L20 14 Z' "
    "fill='white' stroke='black' stroke-width='1.5' stroke-linejoin='round'/></svg>"
)


def install_cursor(page):
    page.evaluate(
        """(svg) => {
            const c = document.createElement('img');
            c.id = '__cur';
            c.src = svg;
            Object.assign(c.style, {
                position: 'fixed', left: '0px', top: '0px', width: '28px',
                height: '28px', zIndex: 99999, pointerEvents: 'none',
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.4))', transition: 'none',
            });
            document.body.appendChild(c);
        }""",
        CURSOR_SVG,
    )


class Recorder:
    def __init__(self, page):
        self.page = page
        self.frames = []      # list[PIL.Image]
        self.durations = []   # list[int ms]
        self.cx, self.cy = W / 2, H / 2

    def _place_cursor(self, x, y):
        self.page.mouse.move(x, y)
        self.page.evaluate(
            "([x,y]) => { const c=document.getElementById('__cur');"
            "c.style.left=x+'px'; c.style.top=y+'px'; }",
            [x, y],
        )
        self.cx, self.cy = x, y

    def snap(self, dur=FPS_MS):
        png = self.page.screenshot()
        self.frames.append(Image.open(BytesIO(png)).convert("RGB"))
        self.durations.append(dur)

    def hold(self, ms=HOLD_MS):
        """Linger on the current state without re-screenshotting."""
        if self.frames:
            self.durations[-1] += ms
        else:
            self.snap(ms)

    def glide(self, x, y, steps=14, settle=12):
        """Ease the cursor from its current spot to (x,y), a frame per step."""
        x0, y0 = self.cx, self.cy
        for i in range(1, steps + 1):
            t = i / steps
            ease = t * t * (3 - 2 * t)          # smoothstep
            self._place_cursor(x0 + (x - x0) * ease, y0 + (y - y0) * ease)
            self.page.wait_for_timeout(settle)
            self.snap()

    def live(self, seconds):
        """Capture real-time playback: snap continuously, true wall-clock
        durations per frame so WebP playback speed matches the app."""
        end = time.monotonic() + seconds
        prev = time.monotonic()
        while time.monotonic() < end:
            self.snap()
            now = time.monotonic()
            self.durations[-1] = max(20, round((now - prev) * 1000))
            prev = now


def rect_center(page, selector):
    r = page.evaluate(
        """(sel) => { const e=document.querySelector(sel);
            const b=e.getBoundingClientRect();
            return {x:b.x+b.width/2, y:b.y+b.height/2}; }""",
        selector,
    )
    return r["x"], r["y"]


def record(url, out_path):
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": W, "height": H},
                                device_scale_factor=1)
        page.goto(url)
        page.wait_for_selector(".word")        # demo text rendered
        page.wait_for_timeout(300)

        # Pre-roll (not captured): bigger font so the hero reads well at 880px.
        page.fill(".font", "22")
        page.wait_for_timeout(100)
        install_cursor(page)

        rec = Recorder(page)
        rec._place_cursor(W / 2, H - 180)      # park above the toolbar

        # Act 1 -- Book pacer. Settled parchment page with the demo text.
        rec.snap(); rec.hold(900)

        # Glide to play, click -> chunk highlight marches through the text.
        px, py = rect_center(page, ".play")
        rec.glide(px, py)
        page.click(".play")
        rec.live(3.8)

        # Pause via the same button (already under the cursor).
        page.click(".play")
        rec.snap(); rec.hold(350)

        # Act 2 -- switch to RSVP: dark stage, centered word.
        mx, my = rect_center(page, '[data-mode="rsvp"]')
        rec.glide(mx, my, steps=16)
        page.click('[data-mode="rsvp"]')
        rec.snap(); rec.hold(800)

        # Play -> ORP letter flashing word by word.
        px, py = rect_center(page, ".play")
        rec.glide(px, py)
        page.click(".play")
        rec.live(2.6)

        # Speed bump: -> -> raises wpm 250 -> 300 mid-flight (meta updates).
        page.keyboard.press("ArrowRight")
        page.keyboard.press("ArrowRight")
        rec.live(2.4)

        # Pause, then close the loop: back to Book, speed + position back to
        # the opening state so the last frame matches the first.
        page.click(".play")
        rec.snap(); rec.hold(300)
        page.keyboard.press("ArrowLeft")
        page.keyboard.press("ArrowLeft")
        bx, by = rect_center(page, '[data-mode="book"]')
        rec.glide(bx, by, steps=16)
        page.click('[data-mode="book"]')
        rec.snap(); rec.hold(200)
        rx, ry = rect_center(page, ".reset")
        rec.glide(rx, ry, steps=10)
        page.click(".reset")
        page.wait_for_timeout(150)
        rec._place_cursor(W / 2, H - 180)      # same park as frame 1
        rec.snap(); rec.hold(900)

        browser.close()

    # Downscale and write the looping animated WebP.
    scale = OUT_W / W
    size = (OUT_W, round(H * scale))
    frames = [f.resize(size, Image.LANCZOS) for f in rec.frames]
    frames[0].save(
        out_path, save_all=True, append_images=frames[1:],
        duration=rec.durations, loop=0, quality=84, method=6,
    )
    kb = out_path.stat().st_size / 1024
    total_s = sum(rec.durations) / 1000
    print(f"wrote {out_path} — {len(frames)} frames, {total_s:.1f}s, {kb:.0f} KB")
    return 0


def main(argv):
    if len(argv) != 2:
        print("usage: make_hero.py <app-url> <out.webp>", file=sys.stderr)
        return 1
    return record(argv[0], argv[1])


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))

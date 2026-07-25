from playwright.sync_api import sync_playwright
import pathlib

html_path = pathlib.Path(__file__).parent / "promo.html"
out_path = pathlib.Path(__file__).parent / "promo.png"

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/opt/pw-browsers/chromium-1194/chrome-linux/chrome")
    page = browser.new_page(viewport={"width": 1080, "height": 1350}, device_scale_factor=2)
    page.goto(f"file://{html_path}")
    page.screenshot(path=str(out_path))
    browser.close()

print(f"Saved {out_path}")

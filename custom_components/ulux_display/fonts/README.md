# Fonts

This directory holds font files used by the u::lux Display renderer.

**All three fonts are required for proper rendering.** Without them, text sizing and icons will not render correctly.

---

## Required fonts

| File | Usage | Size |
|------|-------|------|
| `DejaVuSans.ttf` | Regular text | ~757 kB |
| `DejaVuSans-Bold.ttf` | Bold text / headings | ~706 kB |
| `materialdesignicons-webfont.ttf` | Material Design icons | ~1.3 MB |

---

## Installation

### DejaVu fonts

The DejaVu fonts are free (Bitstream Vera licence) and ship with most Linux distributions:

```bash
# Debian / Ubuntu
apt-get install fonts-dejavu

# Then copy them here:
cp /usr/share/fonts/truetype/dejavu/DejaVuSans.ttf .
cp /usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf .
```

Or download from https://dejavu-fonts.github.io/

**Windows**: Copy from `C:\Windows\Fonts\` if you have them locally.

### MDI icon font

Download **materialdesignicons-webfont.ttf** from the
[@mdi/font](https://github.com/Templarian/MaterialDesign-Webfont) release page.

```bash
# Example — adjust version as needed:
curl -L https://github.com/Templarian/MaterialDesign-Webfont/raw/master/fonts/materialdesignicons-webfont.ttf \
     -o materialdesignicons-webfont.ttf
```

---

## Rendering Without Fonts

If fonts are missing:

- Text will fall back to PIL's built-in bitmap font (very small, low quality)
- Icons will render as empty boxes (missing glyphs)
- Font sizes will be incorrect
- Preview will be hard to read

**Install the fonts to fix this.**

---

## Verifying Installation

1. In Home Assistant, go to **Settings → Devices & Services → u::lux Display**
2. Open a device and view the preview
3. Check if text and icons render at proper size and clarity
4. If too small or broken, fonts are missing

---

## Font Customization

You can add custom fonts:

1. Copy `.ttf` files to this directory
2. Restart Home Assistant
3. In widget config, reference by filename (without extension)

Example:
```python
widget = TextWidget(text="Hello", font="MyCustomFont")
```

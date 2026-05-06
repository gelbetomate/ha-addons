# Fonts

This directory holds font files used by the u::lux Display renderer.

## Required fonts

| File | Usage |
|------|-------|
| `DejaVuSans.ttf` | Regular text |
| `DejaVuSans-Bold.ttf` | Bold text / headings |
| `materialdesignicons-webfont.ttf` | MDI icons |

## Installation

### DejaVu fonts

The DejaVu fonts are free (Bitstream Vera licence) and ship with most
Linux distributions:

```bash
# Debian / Ubuntu
apt-get install fonts-dejavu

# Then copy them here:
cp /usr/share/fonts/truetype/dejavu/DejaVuSans.ttf .
cp /usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf .
```

Or download from https://dejavu-fonts.github.io/

### MDI icon font

Download **materialdesignicons-webfont.ttf** from the
[@mdi/font](https://github.com/Templarian/MaterialDesign-Webfont) release
page and copy it here.

```bash
# Example — adjust version as needed:
curl -L https://github.com/Templarian/MaterialDesign-Webfont/raw/master/fonts/materialdesignicons-webfont.ttf \
     -o materialdesignicons-webfont.ttf
```

> **Note:** Without the bundled fonts the renderer falls back to system
> fonts (DejaVu) and PIL's built-in bitmap font (for icons).  Icons will
> render as empty boxes if `materialdesignicons-webfont.ttf` is missing.

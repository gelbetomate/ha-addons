import os

BASE = "custom_components/ulux_display"

def rename(s):
    s = s.replace('"GeekMagic Display"', '"u::lux Display"')
    s = s.replace("'GeekMagic Display'", "'u::lux Display'")
    s = s.replace("GeekMagic Display", "u::lux Display")
    s = s.replace("GEEKMAGIC", "ULUX_DISPLAY")
    s = s.replace("GeekMagic", "UluxDisplay")
    s = s.replace("geekmagic", "ulux_display")
    return s

def w(path, content):
    full = os.path.join(BASE, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w") as f:
        f.write(rename(content))
    print(f"Written: {path}")


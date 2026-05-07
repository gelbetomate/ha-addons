"""Constants for u::lux Display integration."""

DOMAIN = "ulux_display"

# Display dimensions
DISPLAY_WIDTH = 240
DISPLAY_HEIGHT = 240

# Default settings
DEFAULT_REFRESH_INTERVAL = 10  # seconds

# Bridge connection settings
CONF_BRIDGE_URL = "bridge_url"
CONF_SWITCH_ID = "switch_id"
DEFAULT_BRIDGE_URL = "http://localhost:8099"

# Backoff settings for offline device handling
MAX_BACKOFF_MULTIPLIER = 16
BACKOFF_LOG_INTERVAL = 30

# Config keys
CONF_NAME = "name"
CONF_REFRESH_INTERVAL = "refresh_interval"
CONF_LAYOUT = "layout"
CONF_WIDGETS = "widgets"

# Multi-screen config keys
CONF_SCREENS = "screens"
CONF_SCREEN_NAME = "screen_name"
CONF_SCREEN_CYCLE_INTERVAL = "screen_cycle_interval"
CONF_CURRENT_SCREEN = "current_screen"
CONF_SCREEN_THEME = "theme"
DEFAULT_SCREEN_CYCLE_INTERVAL = 0  # 0 = manual only, >0 = seconds between screens

# Theme types
THEME_CLASSIC = "classic"
THEME_MINIMAL = "minimal"
THEME_NEON = "neon"
THEME_RETRO = "retro"
THEME_SOFT = "soft"
THEME_LIGHT = "light"
THEME_OCEAN = "ocean"
THEME_SUNSET = "sunset"
THEME_FOREST = "forest"
THEME_CANDY = "candy"

THEME_OPTIONS = {
    THEME_CLASSIC: "Classic",
    THEME_MINIMAL: "Minimal",
    THEME_NEON: "Neon",
    THEME_RETRO: "Retro",
    THEME_SOFT: "Soft",
    THEME_LIGHT: "Light",
    THEME_OCEAN: "Ocean",
    THEME_SUNSET: "Sunset",
    THEME_FOREST: "Forest",
    THEME_CANDY: "Candy",
}

# Layout types
LAYOUT_GRID_2X2 = "grid_2x2"
LAYOUT_GRID_2X3 = "grid_2x3"
LAYOUT_GRID_3X2 = "grid_3x2"
LAYOUT_GRID_3X3 = "grid_3x3"
LAYOUT_HERO = "hero"
LAYOUT_SPLIT_H = "split_horizontal"
LAYOUT_SPLIT_V = "split_vertical"
LAYOUT_THREE_COLUMN = "three_column"
LAYOUT_THREE_ROW = "three_row"
LAYOUT_SPLIT_H_1_2 = "split_h_1_2"
LAYOUT_SPLIT_H_2_1 = "split_h_2_1"
LAYOUT_SIDEBAR_LEFT = "sidebar_left"
LAYOUT_SIDEBAR_RIGHT = "sidebar_right"
LAYOUT_HERO_TL = "hero_corner_tl"
LAYOUT_HERO_TR = "hero_corner_tr"
LAYOUT_HERO_BL = "hero_corner_bl"
LAYOUT_HERO_BR = "hero_corner_br"
LAYOUT_HERO_SIMPLE = "hero_simple"
LAYOUT_FULLSCREEN = "fullscreen"

# Widget types
WIDGET_CAMERA = "camera"
WIDGET_CLOCK = "clock"
WIDGET_ENTITY = "entity"
WIDGET_MEDIA = "media"
WIDGET_CHART = "chart"
WIDGET_TEXT = "text"
WIDGET_GAUGE = "gauge"
WIDGET_PROGRESS = "progress"
WIDGET_MULTI_PROGRESS = "multi_progress"
WIDGET_STATUS = "status"
WIDGET_STATUS_LIST = "status_list"
WIDGET_WEATHER = "weather"

LAYOUT_SLOT_COUNTS = {
    LAYOUT_GRID_2X2: 4,
    LAYOUT_GRID_2X3: 6,
    LAYOUT_GRID_3X2: 6,
    LAYOUT_GRID_3X3: 9,
    LAYOUT_HERO: 4,
    LAYOUT_SPLIT_H: 2,
    LAYOUT_SPLIT_V: 2,
    LAYOUT_THREE_COLUMN: 3,
    LAYOUT_THREE_ROW: 3,
    LAYOUT_SPLIT_H_1_2: 2,
    LAYOUT_SPLIT_H_2_1: 2,
    LAYOUT_SIDEBAR_LEFT: 4,
    LAYOUT_SIDEBAR_RIGHT: 4,
    LAYOUT_HERO_TL: 6,
    LAYOUT_HERO_TR: 6,
    LAYOUT_HERO_BL: 6,
    LAYOUT_HERO_BR: 6,
    LAYOUT_HERO_SIMPLE: 2,
    LAYOUT_FULLSCREEN: 1,
}

WIDGET_TYPE_NAMES = {
    WIDGET_CAMERA: "Camera",
    WIDGET_CLOCK: "Clock",
    WIDGET_ENTITY: "Entity",
    WIDGET_MEDIA: "Media Player",
    WIDGET_CHART: "Chart",
    WIDGET_TEXT: "Text",
    WIDGET_GAUGE: "Gauge",
    WIDGET_PROGRESS: "Progress",
    WIDGET_MULTI_PROGRESS: "Multi Progress",
    WIDGET_STATUS: "Status",
    WIDGET_STATUS_LIST: "Status List",
    WIDGET_WEATHER: "Weather",
}

# Colors (RGB tuples)
COLOR_WHITE = (255, 255, 255)
COLOR_BLACK = (0, 0, 0)
COLOR_GRAY = (150, 150, 150)
COLOR_DARK_GRAY = (50, 50, 50)
COLOR_PANEL = (18, 18, 18)
COLOR_PANEL_BORDER = (60, 60, 60)

COLOR_PURPLE = (127, 60, 141)
COLOR_TEAL = (17, 165, 121)
COLOR_BLUE = (57, 105, 172)
COLOR_YELLOW = (242, 183, 1)
COLOR_PINK = (231, 63, 116)
COLOR_GREEN = (128, 186, 90)

COLOR_CYAN = (27, 158, 119)
COLOR_ORANGE = (217, 95, 2)
COLOR_LAVENDER = (117, 112, 179)
COLOR_MAGENTA = (231, 41, 138)
COLOR_LIME = (102, 166, 30)
COLOR_GOLD = (230, 171, 2)
COLOR_BROWN = (166, 118, 29)
COLOR_RED = (231, 76, 60)

# Standard placeholder strings
PLACEHOLDER_VALUE = "--"
PLACEHOLDER_TEXT = "No data"
PLACEHOLDER_NAME = "Unknown"

# Spacing constants (in pixels)
SPACING_XS = 4
SPACING_SM = 6
SPACING_MD = 8
SPACING_LG = 10
SPACING_XL = 14

# Responsive padding percentages
PADDING_COMPACT = 0.04
PADDING_STANDARD = 0.06
PADDING_SPACIOUS = 0.08

# Icon sizing constants
ICON_SIZE_XS = 12
ICON_SIZE_SM = 14
ICON_SIZE_MD = 16
ICON_SIZE_LG = 20
ICON_SIZE_XL = 24
ICON_SIZE_MAX = 32

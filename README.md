# Home Assistant Add-on Repository

[![Add repository on my Home Assistant][badge-repo]][repo-add]

## Add-ons

This repository contains the following add-ons:

### [Example add-on][addon-example]

![Supports aarch64 Architecture][aarch64-shield]
![Supports amd64 Architecture][amd64-shield]
![Supports armhf Architecture][armhf-shield]
![Supports armv7 Architecture][armv7-shield]
![Supports i386 Architecture][i386-shield]

_Example Home Assistant add-on._

## Installation

1. Navigate in your Home Assistant frontend to **Settings** → **Add-ons** → **Add-on store**.
2. Click the three-dot menu in the upper right corner and choose **Repositories**.
3. Add the following URL: `https://github.com/gelbetomate/ha-addons`
4. Find the add-on you want to install and click **Install**.

[aarch64-shield]: https://img.shields.io/badge/aarch64-yes-green.svg
[amd64-shield]: https://img.shields.io/badge/amd64-yes-green.svg
[armhf-shield]: https://img.shields.io/badge/armhf-yes-green.svg
[armv7-shield]: https://img.shields.io/badge/armv7-yes-green.svg
[i386-shield]: https://img.shields.io/badge/i386-yes-green.svg
[addon-example]: example/
[badge-repo]: https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg
[repo-add]: https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fgelbetomate%2Fha-addons
# gelbetomate Home Assistant Add-ons

[![Add Repository](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fgelbetomate%2Fha-addons)

A collection of Home Assistant add-ons.

## Installation

1. Open your Home Assistant instance.
2. Navigate to **Settings → Add-ons → Add-on Store**.
3. Click the three-dot menu (⋮) in the top-right corner and select **Repositories**.
4. Paste the following URL and click **Add**:
   ```
   https://github.com/gelbetomate/ha-addons
   ```
5. The add-ons from this repository will now appear in the Add-on Store.

Alternatively, click the badge above to add the repository automatically.

## Available Add-ons

| Add-on | Description |
|--------|-------------|
| [u::Lux UMP Bridge](addons/ulux/README.md) | UDP bridge for u::Lux Switch IP devices — decodes UMP key events, auto-initialises switches, and publishes `ulux_event` / `ulux_key` events to Home Assistant and/or MQTT. |

## Support

Open an issue at <https://github.com/gelbetomate/ha-addons/issues>.


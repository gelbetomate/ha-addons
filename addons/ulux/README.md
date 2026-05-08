# u::Lux UMP Bridge Add-on

The bridge add-on is responsible for transport and discovery observation.

## Current responsibilities

- listen for UMP packets on UDP 34988
- reply to init/time requests
- stream images to the switch
- maintain a discovery list of observed devices
- expose discovery over HTTP

## Not responsible for

- being the canonical persistent registry
- user-facing switch management UX
- Home Assistant config entries

## Intended future role

The bridge should continue to observe devices and feed the persistent registry, but not replace the registry itself.

# Security Policy

## Supported versions

Only the latest minor release line of each published package receives
security fixes. While the project is on 0.x, that is the newest `0.y` line.

| Package | Supported |
| --- | --- |
| `@esershnr/caramel-webplayer` 0.1.x | yes |
| `@esershnr/caramel-theme` 0.1.x | yes |
| `@esershnr/caramel-icons` 0.1.x | yes |
| `@esershnr/caramel-skin` 0.1.x | yes |
| `@esershnr/caramel-skip-segments` 0.1.x | yes |
| `@esershnr/caramel-chapters` 0.1.x | yes |
| `@esershnr/caramel-playlist` 0.1.x | yes |
| Older versions | no |

The `scripts/*` CLIs (`caramel-gen-thumbs`, `caramel-encode-hls`) and the
demos in `examples/` are not published; fixes land on `main` only.

## Reporting a vulnerability

Please do not open a public issue, pull request or discussion for a security
problem.

Report it privately through GitHub:
[Security, Report a vulnerability](https://github.com/esershnr/caramel-webplayer/security/advisories/new)
(private vulnerability reporting). Include the affected package and version,
a description of the impact, and steps or a minimal page that reproduces it.

What to expect:

- An acknowledgement within 7 days.
- An assessment and, if confirmed, a fix plan within 30 days.
- A coordinated release: the fix ships as a patch release and a GitHub
  security advisory credits you, unless you prefer to stay anonymous.

## Scope

In scope: code in the published `@esershnr/caramel-*` packages, for example
markup injection through segment labels, chapter titles or playlist data,
unsafe handling of URLs from manifests, or storage misuse.

Out of scope: vulnerabilities in Video.js itself (report those to the
[Video.js project](https://github.com/videojs/v10)), in browsers, or in
sites that embed the player with their own unsafe configuration.

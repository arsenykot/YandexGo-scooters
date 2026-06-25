# Yandex Go Scooters — Static version

Pure HTML + CSS + JavaScript. No Node.js, no build step, no FastAPI.

Works on phone via Termux with a single Python command.

## Quick start (Termux)

```bash
pkg update && pkg upgrade -y
pkg install -y git python
git clone https://github.com/arsenykot/YandexGo-scooters.git
cd YandexGo-scooters/static
python -m http.server 8080
```

Open in phone browser: **http://127.0.0.1:8080**

> Do not open `index.html` directly (`file://`) — camera and QR scanner need HTTP.

## Quick start (PC)

```bash
cd static
python -m http.server 8080
```

Open: **http://127.0.0.1:8080**

## What's inside

| File | Purpose |
|------|---------|
| `index.html` | Entry point |
| `js/store.js` | All demo logic (was Python backend) |
| `js/utils.js` | Formatting, camera helpers |
| `js/app.js` | UI and hash-router |
| `css/style.css` | All styles |
| `assets/` | Logo, scooter images |
| `icons/` | Map markers |

## Features

- Map with scooter markers
- Reserve / start / pause / finish ride flow
- Minute packages and wallet balance
- QR scanner (via CDN `html5-qrcode`)
- Finish photo screen with camera
- Multiple simultaneous rentals

## Reset demo

Tap **Reset demo** on the main screen.

## Troubleshooting

**Camera not working** — make sure you use `python -m http.server`, not `file://`.

**QR library failed** — need internet on first load (CDN). Use manual number entry as fallback.

**Page not updating timers** — timers refresh every second automatically on home and scooter screens.

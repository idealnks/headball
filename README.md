# Headball

Ein Fußballspiel für den Browser: ein Mensch gegen eine KI, große Köpfe und ein springender Ball. Ein Match dauert 90 Sekunden.

## Entwicklung

Node.js 24 verwenden. Keine externen Laufzeit-Abhängigkeiten erforderlich.

```sh
npm run dev
```

Der HTTP-Server lauscht auf Port 3000 (über `PORT` anpassbar). Pfeiltasten links/rechts bewegen die blaue Figur, oben springt. Leertaste pausiert. Auf Touch-Geräten stehen Richtungstasten bereit.

## Aufbau

`public/game.js` enthält Canvas-Darstellung, KI und Physik mit festen Simulationsschritten. `server.mjs` liefert die statischen Dateien. Schriftarten von Google Fonts sind optional; lokale Ersatzschriften funktionieren ohne Netzwerkzugriff.

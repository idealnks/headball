# Headball

Ein Fußballspiel für den Browser: ein Mensch gegen eine KI, große Köpfe und ein springender Ball. Ein Match dauert 90 Sekunden.

## Entwicklung

Node.js 24 verwenden. Keine externen Laufzeit-Abhängigkeiten erforderlich.

```sh
npm run dev
```

Der HTTP-Server lauscht auf Port 3000 (über `PORT` anpassbar). Pfeiltasten links/rechts bewegen die blaue Figur, oben springt. Die Leertaste kickt einen nahen Ball in Blickrichtung nach vorne und oben. Pause über den Pause-Button. Bei einem eingeklemmten Ball zwischen beiden Figuren löst ein Pressschlag den Ball nach oben. Auf Touch-Geräten stehen Richtungstasten bereit.

## Aufbau

`public/game.js` enthält Canvas-Darstellung, KI und Physik mit festen Simulationsschritten. `server.mjs` liefert die statischen Dateien. Schriftarten von Google Fonts sind optional; lokale Ersatzschriften funktionieren ohne Netzwerkzugriff.

## Spieler und Gegner

Die blaue Figur verwendet den aus dem bereitgestellten Foto erzeugten Kopf in `public/player-face.png`. Der Kick zeigt eine Beinbewegung und bei Ballkontakt einen Trefferblitz. Die KI verfolgt den Ball über die Mittellinie und kickt tiefe Bälle in Richtung des linken Tors.

Physik- und KI-Tests: `node --test`.

## Doppelkopfadler-Spezial

Beim exakten Rückstand von 0:3 bekommt die zurückliegende Seite einmal pro Match einen Spezialschuss. Für den Menschen: Taste S oder Adler-Button. Die KI aktiviert automatisch nach der Torpause. Der Ball verwandelt sich in einen Doppelkopfadler, wirft den Gegner um und erzielt garantiert genau ein Tor. Die Spielzeit pausiert während der Sequenz. Neustart setzt die Fähigkeit zurück. Der KI-Kopf aus dem bereitgestellten Bild liegt in `public/ai-face.png`.

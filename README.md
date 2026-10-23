# Headball

Ein Fußballspiel für den Browser: ein Mensch gegen eine KI, große Köpfe und ein springender Ball. Die Spieldauer ist vor dem Anpfiff in drei Stufen wählbar: 1, 2 oder 3 Minuten (Standard: 2 Minuten). Änderungen gelten ab dem nächsten Anpfiff oder Neustart.

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

Ab drei Toren Rückstand (z. B. 2:5) bekommt die zurückliegende Seite einmal pro Match einen Spezialschuss. Für den Menschen: Taste E oder Adler-Button. Die KI aktiviert automatisch nach der Torpause. Der Ball verwandelt sich in einen Doppelkopfadler, wirft den Gegner um und erzielt garantiert genau ein Tor. Die sechs Sekunden lange Inszenierung umfasst Aufladung, Spiralflug, Einschlag und Torflug. Die Spielzeit pausiert während der Sequenz. Neustart setzt die Fähigkeit zurück. Der KI-Kopf aus dem bereitgestellten Bild liegt in `public/ai-face.png`.

Die größeren Tore lassen hohe Bälle über stehende Figuren hinweg passieren; Springen ermöglicht die Abwehr. Die KI berechnet die Schussbahn einschließlich Luftwiderstand und zielt auf den oberen freien Torbereich.

Die KI variiert Zielhöhe und Schussstärke; bei 30 % ihrer normalen Schüsse wählt sie ein ungenaues Ziel. Figuren blockieren und schieben einander bei Körperkontakt. Ein vollständig übersprungener Gegner kann überquert werden. Der garantierte Spezialschuss bleibt unhaltbar.

## Schrammen und Tor-Express

Kicks gegen eine nahe Figur in Blickrichtung hinterlassen zunächst stilisierte Schrammen, ab dem zweiten Treffer eine kleine Blutspur. Die Stufe ist auf drei begrenzt, mit kurzer Trefferimmunität. Schäden bleiben beim Anstoß erhalten; ein eigenes Tor heilt ausschließlich den Torschützen, Neustart beide.

Nach 60 aktiven Spielsekunden ohne eigenes Tor lädt sich der Tor-Express auf. Mit Z oder dem Zug-Button aktivieren; die KI nutzt ihn automatisch. Der Ball wird zum Zug, fährt auf dem Rasen, schleudert den Gegner beim Zusammenstoß mit einer Drehung in die Luft und trifft garantiert ins Tor. Danach lädt die Fähigkeit erneut; ein eigenes Tor setzt die Ladung zurück. Pause, Torjubel und Spezialsequenzen zählen nicht als Ladezeit. Adler und Zug können nicht gleichzeitig laufen.

Beide Köpfe sind um 15 % vergrößert und wippen leicht; beim Laufen stärker als im Stand. Schrammen bewegen sich mit dem Kopf.

## Startmenü und lokaler Zweispielermodus

Spieldauer (1/2/3 Minuten) und Spielmodus werden im Menü vor dem Anpfiff ausgewählt. „Neues Match“ öffnet dieses Menü erneut. Bei Pause bleiben die Einstellungen verborgen, damit das laufende Match unverändert fortgesetzt wird.

Spieler 1: Pfeiltasten links/rechts, oben zum Springen, Space zum Kicken, E für Adler und Z für Zug. Im KI-Modus funktioniert weiterhin S für Adler. Spieler 2 im Modus „Zu zweit“: A/D laufen, W springen, S oder F kicken, G für Adler und H für Zug. Beide spielen lokal an derselben Tastatur. KI-Steuerung, automatische Spezialschüsse und KI-Zielkorrekturen sind für Spieler 2 abgeschaltet.

## Latte und Verlängerung

Die gesamte waagerechte Latte und ihre runden Enden werden entlang der Ballflugstrecke auf Kollision geprüft. Ein reguläres Tor zählt erst, wenn der ganze Ball die Torlinie passiert hat. Bei Gleichstand gibt es nach der regulären Spielzeit einmalig 30 Sekunden Verlängerung mit neuem Anstoß; Spielstand, Schäden und Spezialladungen bleiben erhalten. Danach endet ein weiterhin ausgeglichenes Match unentschieden.

## Schwierigkeit und Turnier

Im Startmenü für Einzelspiele gegen KI zwischen Leicht, Normal und Schwer wählen. Diese Stufen variieren Bewegungstempo, Zielstreuung, Ballvorhersage und Sprungreichweite. Der lokale Zweispielermodus verwendet keine KI-Einstellungen.

Im Turnier beginnt dein Weg im Viertelfinale gegen Nico (Leicht), danach folgen Bruno im Halbfinale (Normal) und Titan im Finale (Schwer). Gegner haben unterschiedliche Köpfe und Trikotfarben. Ein Sieg schaltet „Nächste Runde“ frei; eine Niederlage beendet den Lauf. Bei Gleichstand nach der einmaligen 30-Sekunden-Verlängerung entscheidet im Turnier Golden Goal. Jede Runde startet mit frischem Spielstand, Fähigkeiten und geheilten Figuren. Die gewählte Spieldauer gilt pro Runde.

## Spielfelder

Im Startmenü zwischen Stadion (ebener Rasen), Acker (hügeliger Boden) und Wippfeld wählen. Die Oberfläche beeinflusst Ballabpraller, Figurenhöhe und Bewegung bergauf/bergab. Tore und Zug folgen der Bodenhöhe. Das Wippfeld kippt alle fünf aktiven Spielsekunden sanft in die andere Richtung: zuerst bergab zum Tor von Spieler 1 (Vorteil Gegner), danach umgekehrt. Eine Anzeige nennt die begünstigte Seite und die Zeit bis zum nächsten Wechsel. Bei Pause, Torjubel oder Spezialsequenzen bleibt das Feld stehen. Die Wahl gilt auch für alle Runden eines Turniers.

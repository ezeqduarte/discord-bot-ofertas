# ofertas-bot

Bot de Discord que monitorea cuentas de Twitter/X y reenvía tweets nuevos a canales de Discord mediante web scraping con Playwright.

## Cómo correr el proyecto

```bash
node index.js
```

Requiere antes:
1. Crear `.env` con las variables de entorno (ver abajo)
2. Registrar los slash commands una sola vez: `node deploy-commands.js`

## Variables de entorno (.env)

```
DISCORD_TOKEN=      # Token del bot de Discord
CHANNEL_ID=         # Canal Discord por defecto
CLIENT_ID=          # ID de la aplicación Discord
GUILD_ID=           # ID del servidor Discord
TWITTER_COOKIES=    # JSON string con las cookies de sesión de Twitter/X
```

## Arquitectura de archivos

```
index.js                  # Loop principal (ciclo cada 5 min), orquestador general
deploy-commands.js        # Script one-time para registrar commands en Discord
src/
  discord/
    client.js             # Cliente Discord, envío de mensajes y embeds
    commands.js           # Handlers de los 6 slash commands
    embeds.js             # Formato de tweets como Discord EmbedBuilder
  scraper/
    index.js              # Playwright/Chromium, scraping de tweets, retry logic
  storage/
    index.js              # CRUD sobre storage.json, escritura atómica
  utils/
    logger.js             # Logging a logs/bot.log con rotación (5MB)
    status.js             # Estado en memoria: uptime, ciclos, timestamps
    username.js           # Validación y normalización de usernames de Twitter
```

## Schema de datos (storage.json)

```json
{
  "users": {
    "twitter_handle": {
      "lastTweetId": "string (ID del último tweet visto)",
      "channelId": "string (canal Discord donde se postean tweets)"
    }
  }
}
```

## Comandos de Discord

| Comando | Descripción |
|---------|-------------|
| `/agregar <usuario>` | Inicia monitoreo de una cuenta Twitter |
| `/quitar <usuario>` | Elimina cuenta del monitoreo |
| `/lista` | Lista todas las cuentas monitoreadas |
| `/chequear <usuario>` | Chequeo manual del último tweet (cooldown 30s) |
| `/estado` | Estado del bot: uptime, cookies, próximo ciclo |
| `/ayuda` | Documentación de todos los comandos |

## Reglas de dominio y patrones establecidos

Estos patrones están implementados y no deben romperse:

- **Deduplicación**: comparar tweet IDs como BigInt para detectar tweets nuevos
- **Retry scraping**: 2 reintentos automáticos con 5s de delay ante fallos
- **Delay entre usuarios**: 8 segundos para evitar rate limiting de Twitter
- **Cooldown /chequear**: 30 segundos por usuario para evitar spam
- **Normalización de usernames**: siempre lowercase, siempre sin `@`
- **Escritura atómica en storage**: escribir en archivo temp → renombrar (evita corrupción)
- **Cookie expiry**: mostrar estado en `/estado` con indicadores 🔴🟡🟢 (expirada/pronto/válida)
- **Filtrar pinned tweets**: nunca notificar tweets fijados al perfil

## Estándares de código

- JavaScript vanilla (sin TypeScript)
- No usar `console.log` directo — usar el sistema de `logger.js` (ya intercepta console)
- Cada módulo exporta funciones específicas; `index.js` es el único orquestador
- Errores de scraping se loguean como warnings y continúan — no detienen el ciclo
- Expiración de cookies sí detiene el bot y manda alerta a Discord antes de salir

## Restricciones del proyecto

- **Sin base de datos**: persistencia solo via `storage.json`
- **Sin framework backend**: Node.js puro, sin Express ni similar
- **Sin testing framework**: no hay tests; no proponer agregar Jest u otros sin consultarlo
- **Sin Telegram**: el bot es exclusivamente Discord
- **Twitter vía scraping**: no hay API key de Twitter/X, acceso solo por cookies de sesión

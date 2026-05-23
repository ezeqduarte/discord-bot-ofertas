# ofertas-bot

Bot de Discord que monitorea cuentas de Twitter/X y reenvía tweets nuevos a canales de Discord mediante web scraping con Playwright.

## Requisitos

- Node.js 18+
- Cuenta de Discord con un bot registrado
- Sesión activa de Twitter/X exportada como cookies JSON

## Instalación

```bash
npm install
```

## Configuración

Crear un archivo `.env` en la raíz con las siguientes variables:

```env
DISCORD_TOKEN=      # Token del bot de Discord
CLIENT_ID=          # ID de la aplicación Discord
GUILD_ID=           # ID del servidor Discord
CHANNEL_ID=         # Canal Discord por defecto
TWITTER_COOKIES=    # Cookies de sesión de Twitter/X en formato JSON
```

### Cómo obtener las cookies de Twitter

1. Iniciar sesión en [x.com](https://x.com) en el browser
2. Instalar una extensión de exportación de cookies (ej. "EditThisCookie")
3. Exportar las cookies como JSON
4. Pegar el contenido JSON completo (el array) como valor de `TWITTER_COOKIES`

## Uso

Registrar los slash commands en el servidor Discord (solo una vez):

```bash
node deploy-commands.js
```

Iniciar el bot:

```bash
node index.js
```

El bot se conecta a Discord, comienza a monitorear las cuentas configuradas y revisa si hay tweets nuevos cada 5 minutos.

## Comandos de Discord

| Comando | Descripción |
|---------|-------------|
| `/agregar <usuario>` | Empieza a monitorear una cuenta. Manda el último tweet como bienvenida. |
| `/quitar <usuario>` | Deja de monitorear una cuenta. |
| `/lista` | Muestra todas las cuentas monitoreadas con link al perfil. |
| `/chequear <usuario>` | Muestra el último tweet de una cuenta ahora mismo (cooldown 30s). |
| `/estado` | Muestra el estado del bot: uptime, cookies, próximo ciclo. |
| `/ayuda` | Muestra todos los comandos disponibles. |

## Estructura del proyecto

```
index.js                  # Orquestador principal, loop de monitoreo cada 5 min
deploy-commands.js        # Script one-time para registrar slash commands
src/
  discord/
    client.js             # Cliente Discord, envío de mensajes y embeds
    commands.js           # Definición y handlers de los slash commands
    embeds.js             # Formateador de tweets como Discord Embeds
  scraper/
    index.js              # Web scraping con Playwright/Chromium
  storage/
    index.js              # Persistencia en storage.json (escritura atómica)
  utils/
    logger.js             # Sistema de logs con rotación (5MB, archivo logs/bot.log)
    status.js             # Estado en memoria: uptime, timestamps de ciclos
    username.js           # Validación y normalización de handles de Twitter
```

## Stack

- [discord.js](https://discord.js.org/) v14
- [Playwright](https://playwright.dev/) (Chromium headless)
- [dotenv](https://github.com/motdotla/dotenv)
- Node.js puro (sin framework backend)

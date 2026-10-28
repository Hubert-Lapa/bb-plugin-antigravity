# bb-plugin-antigravity

Run bb threads on **Google Antigravity** over ACP.

Antigravity's `agy` CLI talks to an ACP stdio adapter. This plugin downloads that adapter, points bb's ACP bridge at it, normalizes the CLI's current models into clean families, and exposes native reasoning effort (Low / Medium / High).

## Requirements

`agy` has to be installed and logged in. The plugin does not install Google's CLI for you.

```bash
curl -fsSL https://antigravity.google/cli/install.sh | bash
agy   # log in if it asks
```

`agy-acp` is downloaded into `~/.local/bin` the first time the plugin loads, or when you run `bb antigravity install`. You can still point `adapterCommand` at a binary you already have.

## Installation

```bash
bb plugin install git:github.com/amrtawfik160/bb-plugin-antigravity --yes
```

That is the whole install. After it loads, `acp-antigravity` shows up in the provider picker. If `agy` is missing, the plugin stays in needs-configuration until you install it and reload.

On bb 0.41 the picker reads the builtin ACP plugin's `customAgents` setting. This plugin writes that setting itself. It also still writes `customAcpAgents` in `config.json` for older bb.

Then:

```bash
bb thread spawn --provider acp-antigravity --prompt "..."
```

## Usage

```bash
bb antigravity status     # provider registration and prerequisites
bb antigravity doctor     # status plus a live ACP handshake
bb antigravity install    # download agy-acp if needed and register the provider
bb antigravity enable     # register (also downloads agy-acp if it is missing)
bb antigravity disable    # remove the provider; auto-setup will not put it back
```

`disable` is sticky across reloads so the plugin does not immediately re-register. `enable` or `install` clears that.

agy-acp runs each turn as `agy -p`, which exits when the model yields — including when it starts a screenshot, test, or other background job and says it will look later. With `autoContinue` on (the default), the shim keeps that ACP turn open and sends Continue on the same session so the thread does not go idle.

There is a settings panel under **Extensions → Plugins → Antigravity**.

### Models and reasoning

With the compatibility shim enabled, each new shim process runs `agy models` before starting the adapter. The current CLI catalog replaces `~/.agy-acp/models.json` atomically; that file is only a fallback if the CLI fails. Fallback use is reported on stderr. Without either a live or saved catalog, discovery fails instead of inventing a fixed model list.

Families with multiple `-low`, `-medium` and `-high` variants are shown once, with a separate reasoning control. For example, `gemini-4-argon-medium/high/low` becomes **Gemini 4 Argon** with Medium, High and Low efforts. Available families follow the authenticated CLI account, not this README.

BB also caches provider catalogs: in BB 0.48.0 a catalog older than ten minutes is served while it refreshes in the background. Read it again after discovery finishes. Compare `agy models` with `bb provider models acp-antigravity --json` to distinguish CLI availability from ACP/BB caching. An already running conversation keeps its existing shim and catalog until its provider session is restarted.

## Settings

| Setting | Default | Purpose |
|---|---|---|
| `agentId` | `antigravity` | bb exposes this as provider `acp-<id>` |
| `displayName` | `Antigravity` | Shown in the provider picker |
| `transport` | `connect` | `agy-agent-acp` transport (`connect` warm, `cli` per-turn) |
| `adapterCommand` | *(auto)* | Absolute path to the ACP adapter (`agy-acp` or `agy-agent-acp`) |
| `agyCommand` | *(auto)* | Absolute path to the `agy` CLI |
| `compatibilityShim` | `true` | Normalizes models into clean families and bridges native reasoning effort |
| `autoContinue` | `true` | When Antigravity yields on background work, keep the same ACP turn going instead of going idle |

## Development

```bash
npm install               # install dependencies
bb plugin build .         # build dist/ bundles and metadata
bb plugin reload antigravity
```

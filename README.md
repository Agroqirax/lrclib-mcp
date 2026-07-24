# lrclib-mcp

A stdio [MCP](https://modelcontextprotocol.io) server that exposes the read-only
[lrclib.net](https://lrclib.net/docs) lyrics API as tools for MCP clients (e.g.
Claude Code, Claude Desktop).

Publishing lyrics (`/api/publish`) is intentionally not implemented — this
server only supports looking up existing lyrics.

## Tools

- **get_lyrics** — `GET /api/get`
  Exact-match lookup by `track_name`, `artist_name`, and optionally
  `album_name` / `duration` (seconds). Best when you know precise track
  metadata; returns a single record.
- **get_lyrics_by_id** — `GET /api/get/{id}`
  Fetch a specific lyrics record by its numeric ID (e.g. one returned from
  `search_lyrics`).
- **search_lyrics** — `GET /api/search`
  Search by a generic `q` string and/or `track_name` / `artist_name` /
  `album_name`. Returns an array of matching records (may be empty).

## Requirements

- Node.js 18+ (uses the built-in `fetch`)

## Install

```bash
npm install
```

## Run

```bash
node index.js
```

The server communicates over stdio using the MCP protocol — it's meant to be
launched by an MCP client, not run interactively.

## Configuring with an MCP client

Example client config (e.g. Claude Code / Claude Desktop `mcpServers`):

```json
{
  "mcpServers": {
    "lrclib": {
      "command": "npx",
      "args": ["-y", "git+https://github.com/agroqirax/lrclib-mcp.git"],
      "env": {
        "LRCLIB_API_BASE": "https://lrclib.net/api",
        "LRCLIB_USER_AGENT": "lrclib-mcp/1.0.0 (+https://github.com/agroqirax/lrclib-mcp)"
      }
    }
  }
}
```

Or, if running from a local clone:

```json
{
  "mcpServers": {
    "lrclib": {
      "command": "node",
      "args": ["./index.js"],
      "env": {
        "LRCLIB_API_BASE": "https://lrclib.net/api",
        "LRCLIB_USER_AGENT": "lrclib-mcp/1.0.0 (+https://github.com/agroqirax/lrclib-mcp)"
      }
    }
  }
}
```

## Environment variables

Both are optional and fall back to sane defaults:

| Variable            | Default                                                       | Purpose                                      |
| ------------------- | ------------------------------------------------------------- | -------------------------------------------- |
| `LRCLIB_API_BASE`   | `https://lrclib.net/api`                                      | Override the API base URL                    |
| `LRCLIB_USER_AGENT` | `lrclib-mcp/1.0.0 (+https://github.com/agroqirax/lrclib-mcp)` | Override the `User-Agent` sent to lrclib.net |

## License

GPL-3.0-or-later

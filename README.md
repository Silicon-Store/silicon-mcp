# Silicon MCP

A [Model Context Protocol](https://modelcontextprotocol.io) server for the
**Silicon Product API** — let Claude (or any MCP client) search products,
compare prices, and look up product details across hundreds of stores.

This package is a thin client. All the work runs on Silicon's infrastructure;
the only thing you need locally is an API key.

## Tools

| Tool | Description |
|------|-------------|
| `get_product` | Full product details (price, availability, GTIN/MPN, images, specs) from one product URL |
| `search_products` | Find a product across a region's enabled retailers |
| `compare_prices` | Per-retailer offers + low/high price range for one product |
| `list_retailers` | Supported retailers per region (free) |

## Get an API key

Sign up at **https://siliconstore.com/developers** — the free tier includes a
monthly request allowance. Your key looks like `sk_live_…`.

## Install as a Claude plugin (one command)

```
/plugin marketplace add silicon-store/silicon-mcp
/plugin install silicon@silicon
```

Then set `SILICON_API_KEY` in your environment. The plugin bundles this MCP
server and adds a `/product <url>` command.

## Use with Claude Code (MCP only)

```bash
claude mcp add silicon --env SILICON_API_KEY=sk_live_your_key -- npx -y silicon-mcp
```

## Use with Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "silicon": {
      "command": "npx",
      "args": ["-y", "silicon-mcp"],
      "env": { "SILICON_API_KEY": "sk_live_your_key" }
    }
  }
}
```

## Environment variables

| Var | Required | Default | Purpose |
|-----|----------|---------|---------|
| `SILICON_API_KEY` | yes (stdio) | — | Your `sk_live_…` key |
| `SILICON_API_BASE_URL` | no | `https://productapi.siliconstore.com` | Override the API host |

## Transports

- **stdio** (default): `npx silicon-mcp` — for desktop/CLI MCP clients.
- **Streamable HTTP** (hosted): `node dist/http.js` → `POST /mcp`. Multi-tenant —
  each request forwards the caller's own `Authorization: Bearer sk_…` to the API.

## Develop

```bash
npm install
npm run build
SILICON_API_KEY=sk_live_… npm start
```

## License

MIT — see [LICENSE](LICENSE).

#!/usr/bin/env node
/**
 * Silicon MCP — stdio entrypoint.
 *
 * The default transport for desktop MCP clients (Claude Desktop, Claude Code,
 * the Silicon Claude plugin). Reads SILICON_API_KEY from the environment and
 * exposes the four Silicon tools over stdio.
 *
 *   SILICON_API_KEY=sk_live_… npx silicon-mcp
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { clientFromEnv } from "./client.js";
import { registerTools } from "./tools.js";

async function main(): Promise<void> {
  const client = clientFromEnv();
  const server = new McpServer({ name: "silicon-mcp", version: "1.0.0" });
  registerTools(server, client);
  await server.connect(new StdioServerTransport());
  // stderr only — stdout is the MCP transport and must stay clean.
  console.error("silicon-mcp running on stdio");
}

main().catch((err) => {
  console.error("silicon-mcp failed to start:", err?.message ?? err);
  process.exit(1);
});

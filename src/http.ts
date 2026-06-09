#!/usr/bin/env node
/**
 * Silicon MCP — Streamable HTTP entrypoint (optional, for hosted/remote use).
 *
 * Stateless: each POST /mcp request gets a fresh server + transport. Unlike the
 * stdio transport (which reads one server-side SILICON_API_KEY), the HTTP
 * transport is multi-tenant — it forwards the CALLER's `Authorization: Bearer
 * sk_…` through to the Silicon API, so each connecting client uses their own key.
 *
 *   PORT=8000 node dist/http.js   →   POST http://host:8000/mcp
 */

import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SiliconClient } from "./client.js";
import { registerTools } from "./tools.js";

const PORT = Number(process.env.PORT ?? 8000);

function bearer(req: IncomingMessage): string {
  const h = req.headers["authorization"];
  if (typeof h === "string" && h.toLowerCase().startsWith("bearer ")) {
    return h.slice(7).trim();
  }
  return "";
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : undefined);
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

async function handleMcp(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const apiKey = bearer(req);
  if (!apiKey) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: { type: "auth", message: "Missing Bearer API key." } }));
    return;
  }

  // Stateless: a fresh server + transport per request, scoped to the caller's key.
  const server = new McpServer({ name: "silicon-mcp", version: "1.0.0" });
  registerTools(server, new SiliconClient({ apiKey, baseUrl: process.env.SILICON_API_BASE_URL }));
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

  res.on("close", () => {
    transport.close();
    server.close();
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, await readBody(req));
}

const httpServer = createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "silicon-mcp" }));
    return;
  }
  if (req.method === "POST" && req.url === "/mcp") {
    handleMcp(req, res).catch((err) => {
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
      }
      res.end(JSON.stringify({ error: { type: "server", message: String(err?.message ?? err) } }));
    });
    return;
  }
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: { type: "not_found", message: "Use POST /mcp." } }));
});

httpServer.listen(PORT, () => {
  console.error(`silicon-mcp HTTP transport listening on :${PORT} (POST /mcp)`);
});

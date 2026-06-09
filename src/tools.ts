/**
 * Tool registration shared by both transports (stdio + HTTP).
 *
 * Each tool is a one-to-one forward to a Silicon Product API endpoint. Results
 * are returned both as a JSON text block (for the model to read) and as
 * `structuredContent` (for programmatic clients). Errors are surfaced as a tool
 * error with the API's error type/message, never thrown past the boundary.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SiliconClient, SiliconError } from "./client.js";

function ok(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    structuredContent: data as Record<string, unknown>,
  };
}

function fail(e: unknown) {
  const msg =
    e instanceof SiliconError
      ? `Silicon API error (${e.type}, HTTP ${e.status}): ${e.message}`
      : `Unexpected error: ${(e as Error).message}`;
  return { content: [{ type: "text" as const, text: msg }], isError: true };
}

export function registerTools(server: McpServer, client: SiliconClient): void {
  server.registerTool(
    "get_product",
    {
      title: "Look up product",
      description:
        "Look up a product by its URL — price, availability, images, specs, and identifiers (GTIN/MPN) — from hundreds of online stores.",
      inputSchema: {
        url: z.string().url().describe("The product page URL to look up."),
        fields: z
          .array(z.string())
          .optional()
          .describe("Optional subset of fields to return."),
      },
    },
    async ({ url, fields }) => {
      try {
        return ok(await client.getProduct(url, { fields }));
      } catch (e) {
        return fail(e);
      }
    }
  );

  server.registerTool(
    "search_products",
    {
      title: "Search products",
      description:
        "Find a product across hundreds of stores for a region and return the details for each match.",
      inputSchema: {
        query: z.string().describe("What to search for, e.g. 'Sony WH-1000XM5'."),
        region: z.enum(["UK", "US"]).optional().describe("Region to search (default UK)."),
        retailers: z
          .array(z.string())
          .optional()
          .describe("Optional list of retailer domains to constrain the search."),
        max_results: z.number().int().min(1).max(10).optional().describe("Max results (default 8)."),
      },
    },
    async ({ query, region, retailers, max_results }) => {
      try {
        return ok(await client.searchProducts(query, { region, retailers, max_results }));
      } catch (e) {
        return fail(e);
      }
    }
  );

  server.registerTool(
    "compare_prices",
    {
      title: "Compare prices",
      description:
        "Compare one product's price across multiple retailers and return the per-retailer offers plus the low/high price range. Provide a query OR a product URL.",
      inputSchema: {
        query: z.string().optional().describe("Product to compare, e.g. 'Sony WH-1000XM5'."),
        url: z.string().url().optional().describe("A product URL to seed the comparison from."),
        region: z.enum(["UK", "US"]).optional().describe("Region (default UK)."),
      },
    },
    async ({ query, region, url }) => {
      try {
        return ok(await client.comparePrices({ query, url, region }));
      } catch (e) {
        return fail(e);
      }
    }
  );

  server.registerTool(
    "list_retailers",
    {
      title: "List retailers",
      description: "List the stores Silicon supports, optionally filtered by region. Free — does not consume quota.",
      inputSchema: {
        region: z.enum(["UK", "US"]).optional().describe("Optional region filter."),
      },
    },
    async ({ region }) => {
      try {
        return ok(await client.listRetailers(region));
      } catch (e) {
        return fail(e);
      }
    }
  );
}

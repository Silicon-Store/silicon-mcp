---
description: Look up a product from a store URL with Silicon
argument-hint: <product-url>
---

Use the `get_product` tool (Silicon MCP) to look up the product
at this URL: $ARGUMENTS

Then present the result clearly:
- **Title**, brand, and price (with currency) and whether it's in stock
- Any GTIN / MPN / SKU identifiers
- A one-line summary of key specs if present

If the URL's retailer isn't supported, say so and suggest `list_retailers` to see
what's available. If the lookup fails, report the error type from the API.

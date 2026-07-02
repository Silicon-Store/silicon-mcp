/**
 * Thin HTTP client for the Silicon Product API.
 *
 * This is the ONLY place that talks to the network. It holds nothing but the
 * base URL + API key and forwards calls to the gateway's /v1/* endpoints. There
 * is deliberately ZERO extraction logic here — all of that lives behind the API
 * on Silicon's infrastructure. Keeping the client dumb is what makes this repo
 * safe to open-source: there are no scrapers, selectors, or secrets in it.
 */

const DEFAULT_BASE_URL = "https://productapi.siliconstore.com";

export class SiliconError extends Error {
  type: string;
  status: number;
  code?: string;
  constructor(type: string, message: string, status: number, code?: string) {
    super(message);
    this.name = "SiliconError";
    this.type = type;
    this.status = status;
    this.code = code;
  }
}

export interface SiliconClientOptions {
  apiKey: string;
  baseUrl?: string;
}

export class SiliconClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(opts: SiliconClientOptions) {
    if (!opts.apiKey) {
      throw new Error(
        "SILICON_API_KEY is required (developer signup coming soon)."
      );
    }
    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "silicon-mcp/1.0",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await res.text();
    let json: any = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      /* non-JSON body — leave json empty, fall through to status handling */
    }

    if (!res.ok) {
      const err = json?.error || {};
      throw new SiliconError(
        err.type || "server",
        err.message || `Request failed with status ${res.status}.`,
        res.status,
        err.code
      );
    }
    return json as T;
  }

  getProduct(url: string, opts?: { render?: string; fields?: string[] }) {
    return this.request<any>("POST", "/v1/product", {
      url,
      render: opts?.render ?? "auto",
      ...(opts?.fields ? { fields: opts.fields } : {}),
    });
  }

  searchProducts(query: string, opts?: { region?: string; retailers?: string[]; max_results?: number }) {
    return this.request<any>("POST", "/v1/search", {
      query,
      region: opts?.region ?? "UK",
      ...(opts?.retailers ? { retailers: opts.retailers } : {}),
      ...(opts?.max_results ? { max_results: opts.max_results } : {}),
    });
  }

  comparePrices(opts: { query?: string; url?: string; region?: string }) {
    return this.request<any>("POST", "/v1/compare", {
      ...(opts.query ? { query: opts.query } : {}),
      ...(opts.url ? { url: opts.url } : {}),
      region: opts.region ?? "UK",
    });
  }

  listRetailers(region?: string) {
    const qs = region ? `?region=${encodeURIComponent(region)}` : "";
    return this.request<any>("GET", `/v1/retailers${qs}`);
  }
}

/** Build a client from environment (SILICON_API_KEY, SILICON_API_BASE_URL). */
export function clientFromEnv(): SiliconClient {
  return new SiliconClient({
    apiKey: process.env.SILICON_API_KEY ?? "",
    baseUrl: process.env.SILICON_API_BASE_URL,
  });
}

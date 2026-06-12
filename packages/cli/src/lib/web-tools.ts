const DEFAULT_MAX_BYTES = 100_000;
const FETCH_TIMEOUT = 15_000;

const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^\[?::1\]?$/,
  /^\[?fc[0-9a-f]{2}:/i,
  /\.local$/i,
  /\.internal$/i,
];

function assertSafeUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid URL: ${rawUrl}`);
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`Only http(s) URLs are supported, got ${url.protocol}`);
  }

  if (BLOCKED_HOST_PATTERNS.some((pattern) => pattern.test(url.hostname))) {
    throw new Error(`Blocked host: ${url.hostname} (private/internal addresses are not allowed)`);
  }

  return url;
}

/** Very small HTML-to-text conversion so models get readable page content. */
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function webFetch(options: { url: string; maxBytes?: number }) {
  const url = assertSafeUrl(options.url);
  const maxBytes = Math.min(options.maxBytes ?? DEFAULT_MAX_BYTES, 500_000);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "racore-cli (terminal AI coding assistant)",
        Accept: "text/html, text/plain, application/json, text/markdown, */*",
      },
    });

    const contentType = response.headers.get("content-type") ?? "";
    const raw = await response.text();
    const sliced = raw.slice(0, maxBytes);

    const isHtml = contentType.includes("html") || /^\s*<(!doctype|html)/i.test(sliced);
    const content = isHtml ? htmlToText(sliced) : sliced;

    return {
      url: url.toString(),
      status: response.status,
      contentType,
      truncated: raw.length > maxBytes,
      content,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Fetch timed out after ${FETCH_TIMEOUT / 1000}s: ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export interface LatencyResult {
  /** True if the ping request responded with an HTTP status < 400 */
  isReachable: boolean;
  /** Latency in milliseconds, or null if the check timed out or failed */
  latencyMs: number | null;
}

/**
 * Pings a URL to verify internet reachability and measure round-trip latency.
 * Uses an AbortController to support timeouts.
 * 
 * @param pingUrl The target URL to ping
 * @param timeoutMs Request timeout in milliseconds
 * @returns A promise resolving to LatencyResult
 */
export async function getLatency(pingUrl: string, timeoutMs: number): Promise<LatencyResult> {
  const startTime = Date.now();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  try {
    const controller = new AbortController();
    timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    // Append dynamic timestamp and random string to strictly bypass network/DNS caching
    const uniqueUrl = `${pingUrl}${pingUrl.includes('?') ? '&' : '?'}t=${Date.now()}&r=${Math.random().toString().slice(2)}`;

    // Perform GET request to verify connectivity.
    // We use GET instead of HEAD for maximum compatibility across various CDNs and proxies.
    // Since clients3.google.com/generate_204 returns a 204 No Content response,
    // using GET has negligible bandwidth usage.
    const response = await fetch(uniqueUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

    // Fully consume the response body to prevent connection leaks in React Native
    try {
      await response.text();
    } catch (e) {
      // ignore
    }

    const isReachable = response.ok || response.status < 400;
    const latencyMs = Date.now() - startTime;
    return { isReachable, latencyMs };
  } catch (error) {
    // If it fails due to network/timeout, we are offline.
    return { isReachable: false, latencyMs: null };
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Runs a download speed test by fetching a remote asset, reading the response
 * completely, and calculating the throughput speed in Mbps.
 * 
 * @param speedTestUrl URL of the remote asset to download
 * @param speedTestFileSizeInBytes Known size of the remote asset in bytes
 * @returns A promise resolving to the estimated download speed in Mbps, or null if the test fails
 */
export async function runSpeedTest(
  speedTestUrl: string,
  speedTestFileSizeInBytes: number
): Promise<number | null> {
  try {
    const startTime = Date.now();
    
    const response = await fetch(speedTestUrl, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

    if (!response.ok) {
      throw new Error(`Speed test download failed with status: ${response.status}`);
    }

    // Fully consume the response body so that we measure the complete download duration
    await response.text();

    const durationSec = (Date.now() - startTime) / 1000;
    if (durationSec <= 0) {
      return null;
    }

    const fileSizeBits = speedTestFileSizeInBytes * 8;
    const speedMbps = fileSizeBits / durationSec / 1000000;

    // Round to 2 decimal places (e.g. 15.45)
    return Math.round(speedMbps * 100) / 100;
  } catch (error) {
    console.warn('Network speed test failed:', error);
    return null;
  }
}

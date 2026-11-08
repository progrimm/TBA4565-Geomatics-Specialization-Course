/**
 * Overpass API helper shared by the data scripts.
 */
export const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// Overpass answers 429/502/504 when it is busy; wait and retry a few times.
const RETRIES = 3;
const RETRY_WAIT_MS = 30000;

/**
 * POST an Overpass QL query and return the JSON response.
 * @param {string} query
 * @returns {Promise<{elements: object[]}>}
 */
export async function overpass(query) {
  for (let attempt = 1; ; attempt += 1) {
    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      body: new URLSearchParams({ data: query }),
      headers: { 'User-Agent': 'trondheim-shelter-analysis (NTNU TBA4565 student project)' },
    });
    if (response.ok) return response.json();
    const busy = [429, 502, 503, 504].includes(response.status);
    if (!busy || attempt > RETRIES) {
      throw new Error(`Overpass request failed: ${response.status} ${response.statusText}`);
    }
    console.warn(`Overpass busy (${response.status}), retry ${attempt}/${RETRIES} in 30 s…`);
    await new Promise((resolve) => setTimeout(resolve, RETRY_WAIT_MS));
  }
}

const cache = new Map<string, any>();

export async function fetchWithCache(url: string) {
  if (cache.has(url)) {
    return cache.get(url);
  }
  
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Error fetching ${url}: ${res.status} ${res.statusText} - ${text}`);
    }
    const data = await res.json();
    cache.set(url, data);
    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export function getCache(url: string) {
  return cache.get(url);
}

export function clearCache() {
  cache.clear();
}

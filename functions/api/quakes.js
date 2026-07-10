// Cloudflare Pages Function: /api/quakes
// Server-side proxy + edge cache in front of the USGS Earthquake GeoJSON feeds.
// Why a proxy at all: USGS is keyless/CORS-open and could be called directly from
// the browser, but proxying lets us (a) cache one upstream fetch across every
// visitor instead of one-fetch-per-visitor, (b) whitelist which feeds can be
// requested instead of accepting an arbitrary upstream URL from the client, and
// (c) reshape/trim the payload later without touching front-end code.

const FEEDS = {
  hour: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson',
  day: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
  week: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson',
  significant_week: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson',
  significant_month: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson',
};

const CACHE_SECONDS = 60;

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const feedKey = FEEDS[url.searchParams.get('feed')] ? url.searchParams.get('feed') : 'day';
  const feedUrl = FEEDS[feedKey];

  const cache = caches.default;
  const cacheKey = new Request(url.origin + url.pathname + '?feed=' + feedKey, request);

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  let upstream;
  try {
    upstream = await fetch(feedUrl, { cf: { cacheTtl: CACHE_SECONDS, cacheEverything: true } });
  } catch (err) {
    return jsonResponse({ error: 'upstream_unreachable' }, 502);
  }

  if (!upstream.ok) {
    return jsonResponse({ error: 'upstream_error', status: upstream.status }, 502);
  }

  const data = await upstream.json();

  const response = jsonResponse({
    feed: feedKey,
    fetchedAt: data.metadata ? data.metadata.generated : null,
    count: data.metadata ? data.metadata.count : (data.features || []).length,
    quakes: (data.features || []).map((f) => ({
      id: f.id,
      mag: f.properties.mag,
      place: f.properties.place,
      time: f.properties.time,
      updated: f.properties.updated,
      url: f.properties.url,
      tsunami: f.properties.tsunami,
      alert: f.properties.alert,
      lon: f.geometry.coordinates[0],
      lat: f.geometry.coordinates[1],
      depthKm: f.geometry.coordinates[2],
    })),
  });

  await cache.put(cacheKey, response.clone());
  return response;
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': `public, max-age=${CACHE_SECONDS}`,
      'access-control-allow-origin': '*',
    },
  });
}

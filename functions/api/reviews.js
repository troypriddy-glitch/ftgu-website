// Cloudflare Pages Function: GET /api/reviews
// Pulls the live Google rating, review count, and up to 5 reviews for the
// FTGU Business Profile, and caches the result at the edge for 6 hours.
//
// Needs two environment variables in Cloudflare Pages (Settings > Variables and Secrets):
//   GOOGLE_PLACES_API_KEY  - API key with "Places API (New)" enabled (mark as a Secret)
//   GOOGLE_PLACE_ID        - the Place ID of the Google Business Profile

const CACHE_SECONDS = 6 * 60 * 60;

export async function onRequestGet({ request, env, waitUntil }) {
  const cache = caches.default;
  const cacheKey = new Request(new URL("/api/reviews?cache=v1", request.url).toString());

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const key = env.GOOGLE_PLACES_API_KEY;
  const placeId = env.GOOGLE_PLACE_ID;
  if (!key || !placeId) {
    return json({ error: "Reviews are not configured yet." }, 500, 60);
  }

  let data;
  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      headers: {
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "rating,userRatingCount,googleMapsUri,reviews",
      },
    });
    if (!res.ok) {
      const detail = await res.text();
      return json({ error: `Google returned ${res.status}`, detail: detail.slice(0, 500) }, 502, 300);
    }
    data = await res.json();
  } catch (e) {
    return json({ error: "Could not reach Google." }, 502, 300);
  }

  const reviews = (data.reviews || [])
    .map((r) => ({
      rating: r.rating || 0,
      text: (r.text && r.text.text) || (r.originalText && r.originalText.text) || "",
      when: r.relativePublishTimeDescription || "",
      author: (r.authorAttribution && r.authorAttribution.displayName) || "Google user",
      authorUrl: (r.authorAttribution && r.authorAttribution.uri) || "",
      link: r.googleMapsUri || "",
    }))
    .filter((r) => r.text.trim().length > 0);

  const body = {
    rating: data.rating || null,
    count: data.userRatingCount || null,
    url: data.googleMapsUri || "",
    reviews,
  };

  const response = json(body, 200, CACHE_SECONDS);
  waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

function json(obj, status, maxAge) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": `public, max-age=${maxAge}`,
    },
  });
}

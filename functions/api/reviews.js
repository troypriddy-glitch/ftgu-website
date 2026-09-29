// Cloudflare Pages Function: GET /api/reviews
// Pulls the live Google rating, review count, and up to 5 reviews for the
// FTGU Business Profile, and caches the result at the edge for 6 hours.
//
// Needs two environment variables in Cloudflare Pages (Settings > Variables and Secrets):
//   GOOGLE_PLACES_API_KEY  - API key with "Places API (New)" enabled (mark as a Secret)
//   GOOGLE_PLACE_ID        - the Place ID of the Google Business Profile
//
// If GOOGLE_PLACE_ID points to a listing with no reviews (for example a duplicate
// listing), the function searches Google for the business and uses the matching
// listing with the most reviews instead. The "placeId" in the response shows
// which listing was used.

const CACHE_SECONDS = 6 * 60 * 60;
const SEARCH_TEXT = "From The Ground Up home inspector Port Neches TX";
const PHONE_DIGITS = "4093639868";

export async function onRequestGet({ request, env, waitUntil }) {
  const key = env.GOOGLE_PLACES_API_KEY;
  const configuredId = env.GOOGLE_PLACE_ID;
  if (!key || !configuredId) {
    return json({ error: "Reviews are not configured yet." }, 500, 60);
  }

  const cache = caches.default;
  const cacheKey = new Request(
    new URL("/api/reviews?cache=v2&id=" + encodeURIComponent(configuredId), request.url).toString()
  );
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  let place, placeId = configuredId;
  try {
    place = await getDetails(placeId, key);
    if (!place.userRatingCount) {
      const better = await findListingWithReviews(key);
      if (better && better !== placeId) {
        placeId = better;
        place = await getDetails(placeId, key);
      }
    }
  } catch (e) {
    return json({ error: String(e.message || e).slice(0, 500) }, 502, 300);
  }

  const reviews = (place.reviews || [])
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
    placeId,
    rating: place.rating || null,
    count: place.userRatingCount || null,
    url: place.googleMapsUri || "",
    reviews,
  };

  // Only cache a good answer for the full 6 hours.
  const response = json(body, 200, body.count ? CACHE_SECONDS : 300);
  if (body.count) waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

async function getDetails(id, key) {
  const res = await fetch("https://places.googleapis.com/v1/places/" + encodeURIComponent(id), {
    headers: {
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "id,rating,userRatingCount,googleMapsUri,reviews",
    },
  });
  if (!res.ok) throw new Error("Google returned " + res.status + ": " + (await res.text()));
  return res.json();
}

async function findListingWithReviews(key) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "places.id,places.displayName,places.userRatingCount,places.nationalPhoneNumber",
    },
    body: JSON.stringify({ textQuery: SEARCH_TEXT, maxResultCount: 10 }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const ours = (data.places || []).filter((p) => {
    const phone = String(p.nationalPhoneNumber || "").replace(/\D/g, "");
    const name = (p.displayName && p.displayName.text) || "";
    return phone.endsWith(PHONE_DIGITS) || /from the ground up/i.test(name);
  });
  ours.sort((a, b) => (b.userRatingCount || 0) - (a.userRatingCount || 0));
  return ours.length && ours[0].userRatingCount ? ours[0].id : null;
}

function json(obj, status, maxAge) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=" + maxAge,
    },
  });
}

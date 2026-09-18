/**
 * Geo helpers for radius search and distance display.
 *
 * MongoDB `$geoNear` needs a 2dsphere index and a GeoJSON field, which this
 * schema does not have (coordinates are two plain Floats). Instead we narrow
 * with a cheap bounding-box query the compound index can serve, then refine
 * with exact haversine distance in memory. For a country-scale dataset the
 * box prefilter keeps the in-memory set small.
 */

const EARTH_RADIUS_KM = 6371;

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/** Great-circle distance between two points, in kilometres. */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Bounding box that fully contains a radius around a point.
 *
 * Longitude degrees shrink with latitude, so the lng delta is divided by
 * cos(lat). Near the poles that blows up, hence the clamp — at which point we
 * just accept the whole longitude range and let haversine do the filtering.
 */
export function boundingBox(lat: number, lng: number, radiusKm: number): BoundingBox {
  const latDelta = (radiusKm / EARTH_RADIUS_KM) * (180 / Math.PI);
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const lngDelta =
    Math.abs(cosLat) < 0.01
      ? 180
      : (radiusKm / (EARTH_RADIUS_KM * cosLat)) * (180 / Math.PI);

  return {
    minLat: Math.max(-90, lat - latDelta),
    maxLat: Math.min(90, lat + latDelta),
    minLng: Math.max(-180, lng - Math.abs(lngDelta)),
    maxLng: Math.min(180, lng + Math.abs(lngDelta)),
  };
}

/** "800 m" / "3.4 km" / "27 km" */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

/** Approximate centre of each Rwandan district, for "search near this district". */
export const DISTRICT_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  Gasabo: { lat: -1.9297, lng: 30.1284 },
  Kicukiro: { lat: -1.9866, lng: 30.1039 },
  Nyarugenge: { lat: -1.9536, lng: 30.0588 },
  Bugesera: { lat: -2.2167, lng: 30.1833 },
  Gatsibo: { lat: -1.5833, lng: 30.4167 },
  Kayonza: { lat: -1.8833, lng: 30.6167 },
  Kirehe: { lat: -2.2833, lng: 30.7167 },
  Ngoma: { lat: -2.15, lng: 30.4667 },
  Nyagatare: { lat: -1.2939, lng: 30.3269 },
  Rwamagana: { lat: -1.9487, lng: 30.4347 },
  Burera: { lat: -1.4667, lng: 29.85 },
  Gakenke: { lat: -1.6833, lng: 29.7833 },
  Gicumbi: { lat: -1.5833, lng: 30.1 },
  Musanze: { lat: -1.4997, lng: 29.6347 },
  Rulindo: { lat: -1.7667, lng: 30.05 },
  Gisagara: { lat: -2.6167, lng: 29.8333 },
  Huye: { lat: -2.5967, lng: 29.7394 },
  Kamonyi: { lat: -2.0167, lng: 29.9 },
  Muhanga: { lat: -2.0853, lng: 29.7564 },
  Nyamagabe: { lat: -2.4667, lng: 29.5333 },
  Nyanza: { lat: -2.35, lng: 29.75 },
  Nyaruguru: { lat: -2.6667, lng: 29.5167 },
  Ruhango: { lat: -2.2333, lng: 29.7833 },
  Karongi: { lat: -2.0, lng: 29.3833 },
  Ngororero: { lat: -1.8667, lng: 29.6167 },
  Nyabihu: { lat: -1.65, lng: 29.5167 },
  Nyamasheke: { lat: -2.35, lng: 29.15 },
  Rubavu: { lat: -1.6778, lng: 29.2586 },
  Rusizi: { lat: -2.4833, lng: 28.9167 },
  Rutsiro: { lat: -1.9333, lng: 29.3167 },
};

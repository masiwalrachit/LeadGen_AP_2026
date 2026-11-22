/**
 * The one area the map demo covers. Coordinates are real (so the map lines up with OpenStreetMap),
 * but every business placed inside it is invented: see businesses.ts.
 */
export type LatLng = [lat: number, lng: number];

export type Locality = { name: string; centre: LatLng };

export const DISCOVERY_AREA = {
  id: "south-delhi",
  name: "South Delhi",
  city: "New Delhi",
  centre: [28.5492, 77.2262] as LatLng,
  zoom: 13,
  /** South-west and north-east corners of the search box drawn on the map. */
  bounds: [
    [28.517, 77.188],
    [28.582, 77.27],
  ] as [LatLng, LatLng],
  localities: [
    { name: "Lajpat Nagar", centre: [28.5677, 77.2433] },
    { name: "Defence Colony", centre: [28.5733, 77.2316] },
    { name: "South Extension", centre: [28.5689, 77.2205] },
    { name: "Green Park", centre: [28.5592, 77.2069] },
    { name: "Hauz Khas", centre: [28.5494, 77.2001] },
    { name: "Malviya Nagar", centre: [28.5355, 77.2116] },
    { name: "Saket", centre: [28.5246, 77.2066] },
    { name: "Greater Kailash", centre: [28.5482, 77.2385] },
    { name: "Kalkaji", centre: [28.5414, 77.2585] },
  ] satisfies Locality[],
} as const;

export type LocalityName = (typeof DISCOVERY_AREA.localities)[number]["name"];

export const LOCALITY_NAMES = DISCOVERY_AREA.localities.map((locality) => locality.name) as LocalityName[];

export function isInsideArea([lat, lng]: LatLng): boolean {
  const [[south, west], [north, east]] = DISCOVERY_AREA.bounds;
  return lat >= south && lat <= north && lng >= west && lng <= east;
}

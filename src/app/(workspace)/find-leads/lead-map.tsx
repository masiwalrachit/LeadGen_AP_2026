"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, Rectangle, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { MapPoint } from "@/features/discovery/records";
import type { MapArea } from "./discovery-explorer";
import styles from "./find-leads.module.css";

type LeadMapProps = {
  area: MapArea;
  points: MapPoint[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

/** A round pin showing the score itself, so the colour is never the only signal. */
function pinIcon(point: MapPoint, selected: boolean): L.DivIcon {
  const size = selected ? 40 : 32;
  return L.divIcon({
    className: styles.pinWrap,
    html: `<span class="${styles.pin} ${styles[point.band]} ${selected ? styles.pinSelected : ""}">${point.score}</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/** Glides the map to the selected business. */
function FollowSelection({ point }: { point: MapPoint | null }) {
  const map = useMap();
  useEffect(() => {
    if (!point) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const zoom = Math.max(map.getZoom(), 15);
    if (reduce) map.setView(point.position, zoom);
    else map.flyTo(point.position, zoom, { duration: 0.6 });
  }, [map, point]);
  return null;
}

export default function LeadMap({ area, points, selectedId, onSelect }: LeadMapProps) {
  const selected = points.find((point) => point.id === selectedId) ?? null;
  const icons = useMemo(
    () => new Map(points.map((point) => [point.id, pinIcon(point, point.id === selectedId)])),
    [points, selectedId],
  );

  return (
    <MapContainer
      center={area.centre}
      zoom={area.zoom}
      minZoom={11}
      maxBounds={[
        [area.bounds[0][0] - 0.08, area.bounds[0][1] - 0.1],
        [area.bounds[1][0] + 0.08, area.bounds[1][1] + 0.1],
      ]}
      scrollWheelZoom={false}
      className={styles.map}
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
        className={styles.tiles}
      />
      <Rectangle
        bounds={area.bounds}
        pathOptions={{ className: styles.searchBox, weight: 2, dashArray: "6 6", fillOpacity: 0.04 }}
        interactive={false}
      />
      {points.map((point) => (
        <Marker
          key={point.id}
          position={point.position}
          icon={icons.get(point.id)}
          zIndexOffset={point.id === selectedId ? 1000 : point.qualified ? 100 : 0}
          eventHandlers={{ click: () => onSelect(point.id) }}
          keyboard
          title={`${point.name}, score ${point.score}`}
        >
          <Tooltip direction="top" offset={[0, -16]}>
            {point.name}
          </Tooltip>
        </Marker>
      ))}
      <FollowSelection point={selected} />
    </MapContainer>
  );
}

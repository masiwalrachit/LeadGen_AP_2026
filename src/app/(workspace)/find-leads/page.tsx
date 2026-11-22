import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/misc";
import { DemoStrip } from "@/components/ui/status";
import { DISCOVERY_AREA } from "@/features/discovery/area";
import { mapPoints } from "@/features/discovery/records";
import { DiscoveryExplorer } from "./discovery-explorer";

export const metadata: Metadata = { title: "Find leads" };

export default function FindLeadsPage() {
  return (
    <>
      <PageHeader
        title="Find leads"
        description={`Search one area on the map. Every business found is checked, scored by fixed rules and added to your lead inbox.`}
        badge={<DemoStrip>Invented businesses</DemoStrip>}
      />
      <DiscoveryExplorer
        points={mapPoints()}
        area={{
          name: DISCOVERY_AREA.name,
          centre: DISCOVERY_AREA.centre,
          zoom: DISCOVERY_AREA.zoom,
          bounds: DISCOVERY_AREA.bounds,
          localities: DISCOVERY_AREA.localities.map((locality) => locality.name),
        }}
      />
    </>
  );
}

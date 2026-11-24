// The page of one entry: structure (with the CIF download), property table (with the JSON download),
// and, when the app has an AiiDA database in Materials Cloud Explore (`explore`) and the entry the
// uuid of its structure node, "Explore the provenance" with a link to the node (the AiiDA icon; the uuid
// shows on hover).
import { ExploreButton, PropertyTable } from "mc-react-library";
import { lazy, Suspense } from "react";

import { Failed, DownloadButton, Loading } from "./Common.jsx";
import { propertiesJson } from "./data.js";
import { useDetail } from "./queries.js";

// the viewer (3Dmol, matsci-parse) is loaded when the first structure is shown
const StructureView = lazy(() => import("./StructureView.jsx"));

export default function DetailView({ name, shardCount, explore }) {
  const { data, error, isPending } = useDetail(name, shardCount);
  if (isPending) return <Loading />;
  if (error) return <Failed error={error} />;
  if (!data) return <p className="py-4">Nothing found with the name {name}.</p>;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="min-w-0">
        <Suspense fallback={<Loading />}>
          <StructureView name={name} cif={data.cif} />
        </Suspense>
      </div>
      <div className="min-w-0 space-y-2">
        {explore && data.uuid && (
          <p className="flex items-center gap-2 text-sm">
            Explore the provenance
            <ExploreButton explore_url={explore} uuid={data.uuid} />
          </p>
        )}
        <PropertyTable properties={data.properties} />
        <DownloadButton filename={`${name}.json`} text={propertiesJson(data.properties)} mime="application/json">
          Download json
        </DownloadButton>
      </div>
    </div>
  );
}

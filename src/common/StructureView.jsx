// The 3D structure of an entry (its CIF, as in the archive), parsed by
// matsci-parse and drawn by mc-react-structure-visualizer, with a download menu
// over it: the CIF as it is ("CIF (raw)", with everything the authors put in
// it: partial charges, labels, bonds) and the structure in other formats,
// written by matsci-parse on click (cell, elements and positions only). In its
// own chunk: matsci-parse and the viewer load with the first structure shown.
import { fromCIF, toPOSCAR, toXSF, toXYZ } from "matsci-parse";
import { DownloadDropdown } from "mc-react-library";
import { useMemo } from "react";
import StructureVisualizer from "mc-react-structure-visualizer";

import { Failed } from "./Common.jsx";

const WRITTEN = [
  { label: "XSF", extension: "xsf", write: toXSF },
  { label: "XYZ", extension: "xyz", write: toXYZ },
  { label: "VASP", extension: "vasp", write: toPOSCAR },
];

export default function StructureView({ name, cif }) {
  // parsed once per CIF, not on every render (the viewer redraws on a new structure)
  const parsed = useMemo(() => {
    try {
      return { structure: fromCIF(cif) };
    } catch (error) {
      return { error };
    }
  }, [cif]);
  if (parsed.error) return <Failed error={parsed.error} />;
  const downloads = [
    { label: "CIF (raw)", filename: `${name}.cif`, content: cif },
    ...WRITTEN.map(({ label, extension, write }) => ({
      label,
      filename: `${name}.${extension}`,
      content: () => write(parsed.structure),
    })),
  ];
  return (
    <div className="relative h-[600px] w-full">
      <StructureVisualizer structure={parsed.structure} />
      <div className="absolute right-2 top-2 z-10">
        <DownloadDropdown download_formats={downloads} title="Download structure" />
      </div>
    </div>
  );
}

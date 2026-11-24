// The pages, with this app's config: the landing page (two figures), the two
// plot pages (/figure, /figure_top) and the MOF page.
import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";

import InfoAccordions from "../AccordionContent.jsx";
import { DATA, getJson } from "../common/api.js";
import { Failed, Loading } from "../common/Common.jsx";
import DetailView from "../common/DetailView.jsx";
import Explorer from "../common/Explorer.jsx";
import { config, FIGURES } from "./config.js";

const IMAGES = `${import.meta.env.BASE_URL}images/`;

/** "Working Capacity <i>vs</i> CO2/N2 Selectivity" */
const Caption = ({ caption: { y, x } }) => (
  <>
    {y} <i>vs</i> {x}
  </>
);

// two columns (as the old landing page), one below the other on a phone
const ITEM = "w-full sm:w-[calc((100%_-_2rem)/2)]";

function Figure({ to, image, label, caption }) {
  return (
    <figure className={`${ITEM} space-y-1 text-center`}>
      <Link to={to}>
        <img src={`${IMAGES}${image}`} alt={label} className="mx-auto w-full rounded shadow" />
      </Link>
      <figcaption className="pt-2 text-sm">
        <b>{label}</b>
        <br />
        <Caption caption={caption} />
      </figcaption>
    </figure>
  );
}

// the figure of the old landing page first: the high-performing MOFs
function Landing() {
  return (
    <div className="space-y-8 px-2 pb-6 sm:px-8">
      <p>
        Click on a figure for the <b>interactive plot</b>.
      </p>
      <div className="flex flex-wrap justify-center gap-8">
        <Figure
          to="/figure_top"
          image="top_mofs.png"
          label={FIGURES.top.title}
          caption={FIGURES.top.caption}
        />
        <Figure to="/figure" image="mofs.png" label={FIGURES.all.title} caption={FIGURES.all.caption} />
      </div>
    </div>
  );
}

export const GalleryPage = () => (
  <div className="space-y-6">
    {/* as the sibling apps: subtitle and accordions in a narrower column */}
    <div className="mx-auto max-w-4xl space-y-3 px-6 pt-6 sm:px-10">
      <p className="text-lg">
        A database of 324,426 hypothetical Metal-Organic Frameworks (MOFs) screened for wet flue gas CO<sub>2</sub> capture.
      </p>
      <InfoAccordions />
    </div>
    <Landing />
  </div>
);

// The table of a figure: its parts (public/data/table/<table>/NNN.json) joined, once.
function mergeParts(parts) {
  const first = parts[0];
  const columns = Object.fromEntries(
    Object.keys(first.columns).map((key) => [key, parts.flatMap((p) => p.columns[key])]),
  );
  const categories = Object.fromEntries(
    Object.keys(first.categories).map((key) => [
      key,
      { values: first.categories[key].values, codes: parts.flatMap((p) => p.categories[key].codes) },
    ]),
  );
  return {
    n: parts.reduce((sum, p) => sum + p.n, 0),
    names: parts.flatMap((p) => p.names),
    columns,
    categories,
  };
}

const useFigureTable = (figure) =>
  useQuery({
    queryKey: ["table", figure.table],
    queryFn: async () => {
      const urls = Array.from({ length: figure.tableParts }, (_, i) => `${DATA}table/${figure.table}/${String(i).padStart(3, "0")}.json`);
      return mergeParts(await Promise.all(urls.map(getJson)));
    },
  });

export function FigurePage({ figure }) {
  const [params] = useSearchParams();
  const preset = params.get("preset") ?? figure.defaultPreset;
  const { data, error, isPending } = useFigureTable(figure);
  if (isPending) return <Loading />;
  if (error) return <Failed error={error} />;
  // key: a new figure or a link to another preset restarts the controls
  return <Explorer key={`${figure.table}-${preset}`} config={figure} table={data} preset={preset} />;
}

export function DetailPage() {
  const { name } = useParams();
  return <DetailView name={name} shardCount={config.shardCount} />;
}

/** the old detail?name=<name>[&table=...] links (the table is not needed: one page serves both) */
export function LegacyDetailRedirect() {
  const [params] = useSearchParams();
  const name = params.get("name");
  return <Navigate to={name ? `/detail/${encodeURIComponent(name)}` : "/"} replace />;
}

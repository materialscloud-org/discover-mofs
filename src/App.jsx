import "./index.css";
import MaterialsCloudHeader from "mc-react-header";
import { McAppHeader } from "mc-react-library";
import { Link, Navigate, Route, Routes, useMatch } from "react-router-dom";

import { BackButton } from "./common/Common.jsx";
import { config, FIGURES } from "./MofsExplorer/config.js";
import { DetailPage, FigurePage, GalleryPage, LegacyDetailRedirect } from "./MofsExplorer/Pages.jsx";

// The routes of the old section (select-figure, figure, figure_top, detail?name=),
// relative to where the app is served.
export default function App() {
  const name = useMatch("/detail/:name")?.params.name;
  const onAllFigure = useMatch("/figure");
  const onTopFigure = useMatch("/figure_top");
  const onFigure = onAllFigure || onTopFigure;
  return (
    <>
      <MaterialsCloudHeader
        activeSection="discover"
        breadcrumbsPath={[
          { name: "Discover", link: "https://www.materialscloud.org/discover" },
          { name: config.title, link: name || onFigure ? import.meta.env.BASE_URL : null },
          ...(onFigure ? [{ name: "Interactive plot", link: null }] : []),
          ...(name ? [{ name, link: null }] : []),
        ]}
      />
      <main className="min-h-screen bg-[aliceblue] pb-10">
        <div className="mx-auto max-w-7xl px-4">
          <div className="overflow-hidden bg-white p-4 shadow-sm">
            <McAppHeader
              title={
                <Link to="/" className="text-inherit hover:no-underline">
                  {config.title}
                </Link>
              }
              logo={`${import.meta.env.BASE_URL}mofs.png`}
              logoAlt="Hypothetical MOFs logo"
              dois={config.dois}
            />
            <div className="mt-4 px-4">
              {(name || onFigure) && (
                <div className="mb-3">
                  <BackButton />
                </div>
              )}
              <Routes>
                <Route path="/" element={<GalleryPage />} />
                <Route path="/figure" element={<FigurePage figure={FIGURES.all} />} />
                <Route path="/figure_top" element={<FigurePage figure={FIGURES.top} />} />
                <Route path="/detail/:name" element={<DetailPage />} />
                <Route path="/detail" element={<LegacyDetailRedirect />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

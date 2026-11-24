// A plotly.js figure with WebGL points (the library is loaded with the first plot);
// a click on a point calls onSelect(name) with its customdata[0].
import { useEffect, useRef, useState } from "react";

const loadPlotly = () => import("plotly.js-gl2d-dist-min").then((m) => m.default ?? m);

const CONFIG = { displaylogo: false, responsive: true };

export default function ScatterPlot({ figure, onSelect }) {
  const ref = useRef(null);
  const bound = useRef(false);
  const onSelectRef = useRef(onSelect);
  const [error, setError] = useState(null);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    let cancelled = false;
    loadPlotly()
      .then((Plotly) => {
        const el = ref.current;
        if (cancelled || !el) return;
        Plotly.react(el, figure.data, figure.layout, CONFIG);
        if (!bound.current) {
          // el.on exists once the plot has been made
          el.on("plotly_click", (event) => {
            const name = event.points?.[0]?.customdata?.[0];
            if (name) onSelectRef.current(name);
          });
          bound.current = true;
        }
      })
      .catch((e) => setError(String(e)));
    return () => {
      cancelled = true;
    };
  }, [figure]);

  useEffect(() => {
    const el = ref.current;
    return () => {
      loadPlotly().then((Plotly) => Plotly.purge(el));
    };
  }, []);

  if (error) return <p className="text-red-700">Could not draw the plot: {error}</p>;
  return <div ref={ref} className="h-[600px] w-full" />;
}

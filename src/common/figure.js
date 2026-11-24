// The plotly figure of the scatter plot (scattergl: WebGL, for ~70k points).
import { colorColumns, colorSpec, quantity, withUnit } from "./data.js";

const SIZE = 10;
// the colorbar and the legend share one fixed column right of the plot, so the
// plot area does not move when the colour changes (no margin auto-expansion)
const SIDE = { x: 1.03, xanchor: "left" };
const RIGHT_MARGIN = 170;

/** words joined into lines of at most `width` characters, as plotly <br> lines (the colorbar title column is narrow) */
export function wrapTitle(text, width = 18) {
  const lines = [];
  for (const word of text.split(" ")) {
    const last = lines.length - 1;
    if (last >= 0 && lines[last].length + 1 + word.length <= width) lines[last] += ` ${word}`;
    else lines.push(word);
  }
  return lines.join("<br>");
}

/** { data, layout } for the rows `indices` with x, y and colour columns */
export function scatterFigure(table, config, { x, y, clr }, indices) {
  const qx = quantity(config, x);
  const qy = quantity(config, y);
  const qc = colorColumns(config).find((q) => q.column === clr);
  const xs = table.columns[x];
  const ys = table.columns[y];
  const hover = (colorLine) =>
    [`<b>%{customdata[0]}</b>`, `${qx.label}: %{x} ${qx.unit ?? ""}`, `${qy.label}: %{y} ${qy.unit ?? ""}`, colorLine].join("<br>") +
    "<extra></extra>";
  const points = (subset) => ({
    type: "scattergl",
    mode: "markers",
    x: subset.map((i) => xs[i]),
    y: subset.map((i) => ys[i]),
  });

  const spec = colorSpec(table, config, clr, indices);
  let data;
  if (spec.kind === "category") {
    data = spec.groups.map((g) => ({
      ...points(g.indices),
      name: String(g.value),
      customdata: g.indices.map((i) => [table.names[i]]),
      marker: { color: g.color, size: SIZE, opacity: 0.6 },
      hovertemplate: hover(`${qc.label}: ${g.value}`),
    }));
  } else {
    data = [
      {
        ...points(indices),
        customdata: indices.map((i, k) => [table.names[i], spec.values[k]]),
        marker: {
          color: spec.values,
          colorscale: spec.colorscale,
          showscale: true,
          colorbar: {
            ...SIDE,
            y: 0,
            yanchor: "bottom",
            len: 0.85, // leaves room above for the horizontal title
            thickness: 15,
            title: { text: wrapTitle(qc.label) + (qc.unit ? `<br>[${qc.unit}]` : ""), side: "top", font: { size: 12 } },
          },
          size: SIZE,
        },
        hovertemplate: hover(`${qc.label}: %{customdata[1]} ${qc.unit ?? ""}`),
        showlegend: false,
      },
    ];
  }
  const layout = {
    autosize: true,
    height: 600,
    margin: { l: 70, r: RIGHT_MARGIN, t: 20, b: 60, autoexpand: false },
    xaxis: { title: { text: withUnit(qx) } },
    yaxis: { title: { text: withUnit(qy) } },
    hovermode: "closest",
    dragmode: "zoom",
    ...(spec.kind === "category" && { legend: { ...SIDE, y: 1, yanchor: "top", title: { text: qc.label } } }),
  };
  return { data, layout };
}

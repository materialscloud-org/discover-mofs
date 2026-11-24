// The pure data logic of the explorer (no React, no browser): shard choice,
// filtering, presets, colours. `config` is src/CofsExplorer/config.js, `table`
// the parsed public/data/table.json.

/** FNV-1a (32 bit) of the UTF-8 name: the same as shard_of() in scripts/prepareForFrontend.py */
export function fnv1a32(text) {
  let h = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(text)) {
    h = Math.imul(h ^ byte, 0x01000193) >>> 0;
  }
  return h;
}

export const shardOf = (name, shardCount) => fnv1a32(name) % shardCount;

/**
 * The file holding `name`, relative to data/: {"<name>": {...}}. With a
 * shardCount, the entries share shard files (only when one file per entry
 * would be too many for the deployment, Cloudflare Pages: 20,000); without
 * one, every entry has its own file (names: letters, digits, ".", "_", "-").
 */
export const shardFile = (name, shardCount) =>
  shardCount
    ? `details/${shardOf(name, shardCount).toString(16).padStart(3, "0")}.json.gz`
    : `details/${encodeURIComponent(name)}.json.gz`;

export const quantity = (config, column) => config.columns.find((q) => q.column === column);

export const floatColumns = (config) => config.columns.filter((q) => q.type === "float");

/** the quantities that can colour the points: the float columns, then the list columns with colours */
export const colorColumns = (config) => [
  ...floatColumns(config),
  ...config.columns.filter((q) => q.type === "list" && config.categoryColors[q.column]),
];

/** "Density [kg/m^3]" */
export const withUnit = (q) => (q.unit ? `${q.label} [${q.unit}]` : q.label);

/**
 * The state of the controls for a preset: { key, x, y, clr, filters }.
 * - an unknown key is the default preset;
 * - x, y and clr missing from the preset, or not an option, are the default's;
 * - filters: one entry per config.filters, [low, high] for a float column and
 *   the selected values for a list column; what the preset does not set is the
 *   whole range / all values. Preset entries for columns without a filter are
 *   ignored.
 */
export function resolvePreset(config, requested) {
  const known = Object.hasOwn(config.presets, requested);
  const key = known ? requested : config.defaultPreset;
  const preset = config.presets[key];
  const base = config.presets[config.defaultPreset];
  const axes = new Set(floatColumns(config).map((q) => q.column));
  const colors = new Set(colorColumns(config).map((q) => q.column));
  const pick = (field, allowed) => [preset[field], base[field]].find((v) => allowed.has(v));
  const filters = {};
  for (const column of config.filters) {
    const q = quantity(config, column);
    const set = preset[column];
    if (q.type === "float") filters[column] = set ? [...set] : [...q.range];
    else filters[column] = set ? q.values.filter((v) => set.includes(v)) : [...q.values];
  }
  return { key, x: pick("x", axes), y: pick("y", axes), clr: pick("clr", colors), filters };
}

/**
 * The rows that pass the filters, as an array of indices into the table.
 * As in the old app, a float filter at its full range and a list filter with
 * all values selected do not filter (so values outside the range stay in).
 * Missing values (null) never pass an active float filter, and rows missing a
 * value of the float columns `required` (the plotted ones) are left out.
 */
export function filterIndices(table, config, filters, required = []) {
  const tests = [];
  for (const column of required) {
    const values = table.columns[column];
    if (values) tests.push((i) => values[i] != null);
  }
  for (const [column, selection] of Object.entries(filters)) {
    const q = quantity(config, column);
    if (q.type === "float") {
      if (selection[0] === q.range[0] && selection[1] === q.range[1]) continue;
      const values = table.columns[column];
      tests.push((i) => values[i] != null && values[i] >= selection[0] && values[i] <= selection[1]);
    } else {
      if (q.values.every((v) => selection.includes(v))) continue;
      const { values, codes } = table.categories[column];
      const allowed = values.map((v) => selection.includes(v));
      tests.push((i) => allowed[codes[i]]);
    }
  }
  const indices = [];
  for (let i = 0; i < table.n; i++) {
    if (tests.every((test) => test(i))) indices.push(i);
  }
  return indices;
}

/**
 * How the points of `indices` are coloured by `column`:
 * - a list column with colours: { kind: "category", groups: [{ value, color, indices }] },
 *   in the order of the column's values, groups without points left out;
 * - a float column: { kind: "continuous", values, min, max, colorscale } (values per index).
 */
export function colorSpec(table, config, column, indices) {
  const colors = config.categoryColors[column];
  if (colors) {
    const { values, codes } = table.categories[column];
    const byCode = values.map(() => []);
    for (const i of indices) byCode[codes[i]].push(i);
    const groups = values
      .map((value, code) => ({ value, color: colors[value], indices: byCode[code] }))
      .filter((g) => g.indices.length);
    return { kind: "category", groups };
  }
  const all = table.columns[column];
  const values = indices.map((i) => all[i]);
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return { kind: "continuous", values, min, max, colorscale: "Viridis" };
}

/** the rows of the property table: [key, text], sorted by key as the old table was */
export const propertyRows = (properties) =>
  Object.keys(properties)
    .sort()
    .map((key) => [key, String(properties[key])]);

/** the JSON of "Download json": the properties with sorted keys */
export const propertiesJson = (properties) =>
  JSON.stringify(Object.fromEntries(propertyRows(properties).map(([key]) => [key, properties[key]])), null, 2);

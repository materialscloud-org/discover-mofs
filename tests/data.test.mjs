import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { config, FIGURES } from "../src/MofsExplorer/config.js";
import { colorSpec, filterIndices, fnv1a32, propertiesJson, propertyRows, resolvePreset, shardFile, shardOf } from "../src/common/data.js";
import { scatterFigure, wrapTitle } from "../src/common/figure.js";

const ALL = FIGURES.all;
const TOP = FIGURES.top;

// a tiny table of the all-MOFs figure, in the format of the table parts
const table = {
  n: 5,
  names: ["a", "b", "c", "d", "e"],
  columns: {
    "CO2/N2_selectivity": [100, 300, 200, 150, 60],
    working_capacity_vacuum_swing: [3, 3, 1, 4, 5],
    surface_area: [500, 500, 500, 9000, 100],
    void_fraction: [0.2, 0.2, 0.2, 0.5, 0.9],
    largest_free_sphere_diameter: [4, 5, 6, 7, 8],
  },
  categories: {
    topology: { values: ALL.columns[0].values, codes: [0, 1, 1, 2, 10] },
  },
};

// a tiny table of the top figure (Henry coefficients, adsorbaphore labels)
const top = {
  n: 4,
  names: ["p", "q", "r", "s"],
  columns: {
    henry_coefficient_CO2_298K: [1e5, 2e5, 3e5, 4e5],
    henry_coefficient_H2O_298K: [5e5, 6e5, 7e5, 8e5],
  },
  categories: {
    adsorbaphore_label: { values: TOP.columns.find((q) => q.column === "adsorbaphore_label").values, codes: [0, 2, 2, 4] },
  },
};

test("shard hash: fixed names (same values as the Python script)", () => {
  const expected = {
    default: 990,
    a: 300,
    linker91_CO_linker87_NH_hcb_relaxed: 459,
    linker100_CH_linker41_N_umc_relaxed_interp_3: 0,
    linker98_CO_linker95_NH_pto_relaxed: 983,
  };
  for (const [name, shard] of Object.entries(expected)) assert.equal(shardOf(name, 1024), shard, name);
  assert.equal(fnv1a32(""), 0x811c9dc5);
  assert.equal(fnv1a32("a"), 0xe40c292c); // the FNV-1a test vector
  assert.equal(shardFile("linker100_CH_linker41_N_umc_relaxed_interp_3", 1024), "details/000.json.gz");
  assert.equal(shardFile("linker91_CO_linker87_NH_hcb_relaxed", 1024), "details/1cb.json.gz");
  assert.equal(shardFile("é", 1024), shardFile("é", 1024)); // UTF-8, not UTF-16 units
});

test("shard hash agrees with scripts/prepareForFrontend.py", (t) => {
  const script = fileURLToPath(new URL("../scripts/prepareForFrontend.py", import.meta.url));
  const names = ["x", "MOF-1", "str_m5_o16_o16_sra_sym.77", "naïve", "日本"];
  let out;
  try {
    out = execFileSync(
      "python3",
      [
        "-I",
        "-c",
        "import importlib.util, sys, json\n" +
          "s = importlib.util.spec_from_file_location('p', sys.argv[1]); m = importlib.util.module_from_spec(s); s.loader.exec_module(m)\n" +
          "print(json.dumps([m.shard_of(n) for n in sys.argv[2:]]), m.SHARDS)",
        script,
        ...names,
      ],
      { encoding: "utf8" },
    );
  } catch {
    return t.skip("python3 not available");
  }
  const cut = out.trim().lastIndexOf(" ");
  const [shards, count] = [out.slice(0, cut), out.slice(cut)];
  assert.equal(Number(count), config.shardCount);
  assert.deepEqual(JSON.parse(shards), names.map((n) => shardOf(n, config.shardCount)));
});

test("preset: default of each figure, unknown keys", () => {
  const d = resolvePreset(ALL, "default");
  assert.deepEqual([d.key, d.x, d.y, d.clr], ["default", "CO2/N2_selectivity", "working_capacity_vacuum_swing", "void_fraction"]);
  assert.deepEqual(d.filters["CO2/N2_selectivity"], [50, 250]);
  assert.deepEqual(d.filters.working_capacity_vacuum_swing, [2, 6]);
  assert.deepEqual(d.filters.void_fraction, [0, 1]);
  assert.deepEqual(d.filters.topology, ALL.columns[0].values);
  assert.deepEqual(resolvePreset(ALL, "nope"), d);
  assert.deepEqual(resolvePreset(ALL, undefined), d);
  assert.equal(resolvePreset(ALL, "toString").key, "default");

  const t = resolvePreset(TOP, "default");
  assert.deepEqual([t.key, t.x, t.y, t.clr], ["default", "henry_coefficient_CO2_298K", "henry_coefficient_H2O_298K", "adsorbaphore_label"]);
  assert.deepEqual(t.filters.henry_coefficient_H2O_298K, [0, 1e6]);
  assert.deepEqual(t.filters.henry_coefficient_CO2_298K, [0, 1.2e6]);
  assert.deepEqual(t.filters.adsorbaphore_label, ["A1", "A1+A2", "A2", "A3", "N/A"]);
  // a float filter not set by the preset: its full range
  assert.deepEqual(t.filters["CO2/N2_selectivity"], [0, 500]);
});

test("filters: ranges, lists, full selections do not filter", () => {
  const all = resolvePreset(ALL, "default").filters;
  const f = (patch) => filterIndices(table, ALL, { ...all, ...patch });
  // the default: selectivity 50-250 (row 1 out), working capacity 2-6 (row 2 out)
  assert.deepEqual(f({}), [0, 3, 4]);
  // a full range does not filter: row 1 is back
  assert.deepEqual(f({ "CO2/N2_selectivity": [0, 500] }), [0, 1, 3, 4]);
  assert.deepEqual(f({ topology: ["sra", "pcu"], "CO2/N2_selectivity": [0, 500], working_capacity_vacuum_swing: [0, 6] }), [0, 1, 2]);
  assert.deepEqual(f({ void_fraction: [0.1, 0.3] }), [0]);
  assert.deepEqual(f({ topology: [] }), []);
});

test("colours: adsorbaphore labels and continuous values", () => {
  const cat = colorSpec(top, TOP, "adsorbaphore_label", [0, 1, 2, 3]);
  assert.equal(cat.kind, "category");
  // the order of the values; A1+A2 has no point, N/A is grey
  assert.deepEqual(cat.groups.map((g) => [g.value, g.color, g.indices]), [
    ["A1", "#1f77b4", [0]],
    ["A2", "#ff7f0e", [1, 2]],
    ["N/A", "#778899", [3]],
  ]);
  const num = colorSpec(table, ALL, "void_fraction", [1, 3, 4]);
  assert.deepEqual(num, { kind: "continuous", values: [0.2, 0.5, 0.9], min: 0.2, max: 0.9, colorscale: "Viridis" });
});

test("figure: WebGL traces, one per label or one with a colorbar", () => {
  const byLabel = scatterFigure(top, TOP, { x: "henry_coefficient_CO2_298K", y: "henry_coefficient_H2O_298K", clr: "adsorbaphore_label" }, [0, 1, 2]);
  assert.ok(byLabel.data.every((t) => t.type === "scattergl"));
  assert.deepEqual(byLabel.data.map((t) => t.name), ["A1", "A2"]);
  assert.deepEqual(byLabel.data[1].x, [2e5, 3e5]);
  assert.deepEqual(byLabel.data[1].customdata, [["q"], ["r"]]);
  assert.equal(byLabel.layout.xaxis.title.text, "Henry coefficient CO2 (298K) [mol/kg/bar]");
  const byNum = scatterFigure(table, ALL, { x: "CO2/N2_selectivity", y: "surface_area", clr: "void_fraction" }, [3, 4]);
  assert.equal(byNum.data.length, 1);
  assert.deepEqual(byNum.data[0].marker.color, [0.5, 0.9]);
  assert.equal(byNum.data[0].marker.showscale, true);
  assert.deepEqual(byNum.data[0].customdata, [["d", 0.5], ["e", 0.9]]);
});

test("properties: sorted rows and JSON", () => {
  const props = { "num_carbon": 108, "density [kg/m^3]": 260.5, topology: "pcu", name: "n" };
  assert.deepEqual(propertyRows(props), [
    ["density [kg/m^3]", "260.5"],
    ["name", "n"],
    ["num_carbon", "108"],
    ["topology", "pcu"],
  ]);
  const json = propertiesJson(props);
  assert.deepEqual(Object.keys(JSON.parse(json)), ["density [kg/m^3]", "name", "num_carbon", "topology"]);
  assert.equal(JSON.parse(json).num_carbon, 108);
});

test("config: columns, filters, colours and presets agree", () => {
  for (const figure of Object.values(FIGURES)) {
    const columns = new Set(figure.columns.map((q) => q.column));
    for (const f of figure.filters) assert.ok(columns.has(f), f);
    for (const c of Object.keys(figure.categoryColors)) {
      const q = figure.columns.find((x) => x.column === c);
      assert.deepEqual(Object.keys(figure.categoryColors[c]).sort(), [...q.values].sort());
    }
    for (const [key, preset] of Object.entries(figure.presets)) {
      assert.ok(columns.has(preset.x) && columns.has(preset.y), key);
    }
    assert.ok(figure.tableParts >= 1);
  }
});

test("wrapTitle: lines of at most 18 characters, long words kept whole", () => {
  assert.equal(wrapTitle("Largest included sphere diameter"), "Largest included<br>sphere diameter");
  assert.equal(wrapTitle("Density"), "Density");
  assert.equal(wrapTitle("Supercalifragilisticexpialidocious x"), "Supercalifragilisticexpialidocious<br>x");
});

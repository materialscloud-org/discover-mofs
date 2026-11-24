// The configuration of this app: the old app's (commit 3e20e9c)
// figure/static/{columns,filters,presets}.yml (the figure of all MOFs, /figure)
// and figure_top/static/... (the high-performing MOFs, /figure_top), as JS, in
// the format src/common/ reads.
// The colours of the adsorbaphore labels are the ones of the old columns.yml.

// Where the shards of public/data/details/ are chosen (scripts/prepareForFrontend.py: SHARDS)
export const SHARD_COUNT = 16384;

export const config = {
  title: "Metal-Organic Frameworks",
  dois: ["10.24435/materialscloud:2018.0016/v3"],
  shardCount: SHARD_COUNT,
};

// the quantities shared by the two figures (columns.yml)
const topology = {
  column: "topology",
  type: "list",
  label: "Topology",
  values: ["sra", "pcu", "fof", "acs", "bcu", "pts", "the", "tbo", "nbo", "etb", "rht"],
};
const selectivity = { column: "CO2/N2_selectivity", type: "float", label: "CO2/N2 selectivity", range: [0.0, 500.0] };
const voidFraction = { column: "void_fraction", type: "float", label: "Void fraction", range: [0.0, 1.0] };
const sphere = {
  column: "largest_free_sphere_diameter",
  type: "float",
  label: "Diameter of largest free sphere",
  range: [0.0, 20.0],
  unit: "A",
};
const workingCapacity = {
  column: "working_capacity_vacuum_swing",
  type: "float",
  label: "Working capacity",
  range: [0.0, 6.0],
  unit: "mmol CO2/g",
};
const surfaceArea = { column: "surface_area", type: "float", label: "Geometric surface area", range: [0.0, 10000.0], unit: "m^2/g" };
const henryCO2 = {
  column: "henry_coefficient_CO2_298K",
  type: "float",
  label: "Henry coefficient CO2 (298K)",
  range: [0.0, 2.0e6],
  unit: "mol/kg/bar",
};
const henryH2O = {
  column: "henry_coefficient_H2O_298K",
  type: "float",
  label: "Henry coefficient H2O (298K)",
  range: [0.0, 2.0e6],
  unit: "mol/kg/bar",
};
const adsorbaphore = {
  column: "adsorbaphore_label",
  type: "list",
  label: "Adsorbaphore",
  values: ["A1", "A1+A2", "A2", "A3", "N/A"],
};

// One figure: what the explorer reads (src/common/data.js), its table (table/<table>/,
// tableParts files) and the landing page's caption.
export const FIGURES = {
  all: {
    table: "all",
    tableParts: 4,
    title: "All MOFs",
    itemName: "MOFs", // in messages: "12 of 324257 MOFs"
    // columns.yml order: the X and Y choices follow it
    columns: [topology, selectivity, voidFraction, sphere, workingCapacity, surfaceArea],
    // filters.yml, in this order
    filters: ["topology", "CO2/N2_selectivity", "working_capacity_vacuum_swing", "surface_area", "void_fraction"],
    categoryColors: {},
    defaultPreset: "default",
    presets: {
      default: {
        clr: "void_fraction",
        x: "CO2/N2_selectivity",
        y: "working_capacity_vacuum_swing",
        working_capacity_vacuum_swing: [2.0, 6.0],
        "CO2/N2_selectivity": [50, 250.0],
      },
    },
    caption: { y: "Working Capacity", x: "CO2/N2 Selectivity" },
  },
  top: {
    table: "top",
    tableParts: 1,
    title: "High-performing MOFs",
    itemName: "MOFs",
    columns: [selectivity, voidFraction, sphere, workingCapacity, surfaceArea, henryCO2, henryH2O, adsorbaphore],
    // filters.yml, in this order (the top figure has no topology filter)
    filters: ["adsorbaphore_label", "henry_coefficient_CO2_298K", "henry_coefficient_H2O_298K", "CO2/N2_selectivity", "working_capacity_vacuum_swing", "surface_area", "void_fraction"],
    // the colours of the adsorbaphore labels (columns.yml); "N/A" is grey, as "None" was
    categoryColors: {
      adsorbaphore_label: { A1: "#1f77b4", "A1+A2": "#d62728", A2: "#ff7f0e", A3: "#2ca02c", "N/A": "#778899" },
    },
    defaultPreset: "default",
    presets: {
      default: {
        clr: "adsorbaphore_label",
        x: "henry_coefficient_CO2_298K",
        y: "henry_coefficient_H2O_298K",
        henry_coefficient_H2O_298K: [0.0, 1.0e6],
        henry_coefficient_CO2_298K: [0.0, 1.2e6],
      },
    },
    caption: { y: "Henry coefficient H2O", x: "Henry coefficient CO2" },
  },
};

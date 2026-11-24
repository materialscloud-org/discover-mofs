// The shape of public/data/ (made by scripts/prepareForFrontend.py).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";
import { fromCIF } from "matsci-parse";

import { config, FIGURES } from "../src/MofsExplorer/config.js";
import { shardFile, shardOf } from "../src/common/data.js";

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "data");
const skip = !fs.existsSync(path.join(DIR, "table")) && "run python3 scripts/prepareForFrontend.py first";
const MAX = 25 * 1024 * 1024;
const MOFS = 324426; // the CSV rows and the CIFs
const PLOTTED = { all: 324257, top: 8198 }; // the rows of each figure (the script's report)
const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

const read = (file) => {
  const bytes = fs.readFileSync(path.join(DIR, file));
  return JSON.parse((file.endsWith(".gz") ? zlib.gunzipSync(bytes) : bytes).toString("utf8"));
};
const partFile = (figure, i) => path.join("table", figure, `${String(i).padStart(3, "0")}.json`);

const listFiles = (dir) =>
  fs.readdirSync(path.join(DIR, dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? listFiles(path.join(dir, e.name)) : [path.join(dir, e.name)],
  );

test("files: details as SHARD_COUNT shards, all files under 25 MiB, fewer than 20000", { skip }, () => {
  const details = fs.readdirSync(path.join(DIR, "details")).sort();
  assert.equal(details.length, config.shardCount);
  assert.deepEqual(details, Array.from({ length: config.shardCount }, (_, i) => `${i.toString(16).padStart(3, "0")}.json.gz`).sort());
  assert.deepEqual(fs.readdirSync(DIR).sort(), ["details", "table"]);
  const files = listFiles(".");
  assert.ok(files.length < 20000, `${files.length} files`);
  for (const f of files) assert.ok(fs.statSync(path.join(DIR, f)).size < MAX, f);
});

test("table: the parts of each figure, every config column, one value per MOF", { skip }, () => {
  for (const [key, figure] of Object.entries(FIGURES)) {
    const names = new Set();
    let n = 0;
    for (let i = 0; i < figure.tableParts; i++) {
      const part = read(partFile(figure.table, i));
      assert.equal(part.n, part.names.length, key);
      for (const name of part.names) names.add(name);
      n += part.n;
      for (const q of figure.columns) {
        if (q.type === "float") {
          const values = part.columns[q.column];
          assert.equal(values.length, part.n, q.column);
          assert.ok(values.every(Number.isFinite), q.column);
        } else {
          const { values, codes } = part.categories[q.column];
          assert.deepEqual(values, q.values, q.column);
          assert.equal(codes.length, part.n);
          assert.ok(codes.every((c) => Number.isInteger(c) && c >= 0 && c < values.length), q.column);
        }
      }
    }
    assert.equal(n, PLOTTED[key], key);
    assert.equal(names.size, n, `${key}: names are unique`);
    assert.ok(n <= MOFS);
  }
});

test("details: the shard of a MOF holds it, with its properties and its CIF", { skip }, () => {
  const all = read(partFile("all", 0));
  const top = read(partFile("top", 0));
  // a spread of names of the full table, the first and last of its last part, and the top table
  const last = read(partFile("all", FIGURES.all.tableParts - 1));
  const sample = [all.names[0], all.names[777], last.names[last.n - 1], top.names[0]];
  for (const name of sample) {
    const shard = read(shardFile(name, config.shardCount));
    const entry = shard[name];
    assert.ok(entry, name);
    assert.ok(Object.keys(shard).every((n) => shardOf(n, config.shardCount) === shardOf(name, config.shardCount)));
    assert.ok(Object.keys(entry.properties).length >= 42);
    assert.equal(entry.properties.name, name);
    assert.equal(Object.keys(entry).sort().join(), "cif,properties");
    assert.match(entry.cif, /_cell_length_a/);
  }
  // a top MOF carries the top columns too; the table and the details agree
  const topName = top.names[0];
  const topEntry = read(shardFile(topName, config.shardCount))[topName];
  assert.ok(Object.hasOwn(topEntry.properties, "adsorbaphore_label"));
  assert.ok(Object.hasOwn(topEntry.properties, "henry_coefficient_CO2_298K [mol/kg/bar]"));
  const row = top.names.indexOf(topName);
  const selectivity = topEntry.properties["CO2/N2_selectivity"];
  assert.ok(Math.abs(top.columns["CO2/N2_selectivity"][row] - selectivity) <= Math.abs(selectivity) * 1e-6 + 1e-9);
});

test("details: the CIFs are the archive's files, and matsci-parse reads them", { skip }, () => {
  const fixtures = fs.readdirSync(FIXTURES).filter((f) => f.endsWith(".cif"));
  assert.equal(fixtures.length, 3);
  for (const file of fixtures) {
    const name = file.slice(0, -".cif".length);
    const entry = read(shardFile(name, config.shardCount))[name];
    assert.equal(entry.cif, fs.readFileSync(path.join(FIXTURES, file), "utf8"), name);
    assert.ok(fromCIF(entry.cif).sites.length > 0, name);
  }
});

#!/usr/bin/env python3
"""Rebuild everything the app reads (public/data/) from the original archive
files, with the Python standard library only:

    python3 scripts/prepareForFrontend.py [--verify]

Source: Materials Cloud Archive 10.24435/materialscloud:2018.0016/v3 (record
nsp7v-2dk91). raw/MOF_database.tar.gz and raw/screening_data.tar.gz are
downloaded from the archive API when missing, and checked against the archive's
md5 sums (--verify checks the files already there too). The tarballs are read
in place, nothing is extracted. public/data/ is deleted and written again; the
output is deterministic (no timestamps, sorted names).

Output (public/data/):

- table/<figure>/<NNN>.json, figure = all (/figure) or top (/figure_top), NNN
  the part (PART_ROWS rows each; the full table is over 25 MiB):
    {"n": 100000, "names": [...],
     "columns":    {"void_fraction": [...], ...},               numeric columns
     "categories": {"topology": {"values": [...], "codes": [...]}, ...}}
  Floats are rounded to 5 decimal places, here and in the details.
- details/<xxx>.json.gz, xxx = hex digits of shard_of(name) (SHARDS files),
  gzipped JSON (the app unpacks it with the browser's DecompressionStream):
    {"<name>": {"properties": {"<column> [<unit>]": value, ...}, "cif": "<the archive's CIF>"}}
  One entry per MOF of the CSV (all 324,426). properties holds the 42 columns
  of all_MOFs_screening_data.csv and, for the 8,206 top MOFs, the 24 columns
  only top_MOFs_screening_data.csv has (the values they share agree: checked
  here), so one page serves both tables of the old app.
  cif is the archive's CIF file, text unchanged (the shard holds the text as
  read from the tarball, not a converted form). The app parses it with
  matsci-parse (fromCIF) for the 3D view, and the download offers the file
  itself. No other format is offered: the CIFs carry partial charges under
  program-specific tags, labels and bonds, which no common format keeps.
  Nothing is converted here, so there is no node step. The archive keeps the
  originals; tests/ checks the stored CIFs against them (tests/fixtures/), and
  the self-check compares every 97th shard with the tarball's files.

shard_of is FNV-1a (32 bit) over the UTF-8 bytes of the name, modulo SHARDS;
src/common/data.js has the same function (tests/ compares them on fixed names).

Column keys follow the old app's import_db.py (commit 3e20e9c): "[unit]" removed, text
trimmed, spaces to "_", the unit kept separately; MOFname becomes name.

Data decisions (the old app's behaviour, or where it differed from its config):

- Figure rows. A MOF with void_fraction < 0 is left out of the plots: the old
  query's `void_fraction >= 0` filter (zeo++ found no pores; 169 MOFs). Its
  CIF and properties are still in details/.
- A row with a missing or non-numeric value in a plotted column is left out of
  that figure. In the top table this is exactly the 8 MOFs the old figure_top
  dropped by name (their Henry coefficients are empty); the script checks that
  they are the same 8.
- Every row of the figure is plotted. The old app returned at most 30,000
  points (max_points), in CSV order; the WebGL plot takes all of them.
- adsorbaphore_label: the CSV says "N/A" for 5,773 top MOFs, and the old
  presets.yml lists "None" (a string in YAML), so the value of the data is kept
  and the config uses "N/A".
- Top and all share one detail record (above): the top columns are added to
  the properties of the top MOFs; the old detail?table=top_mofs page is the same.
- experimental_structures.zip (two experimental CIFs) is not read: the old app
  never read it either.
- Floats are rounded to 5 decimal places (the smallest non-zero value is
  0.0025); names, categories and CIFs are exact. The units are in the property
  keys (`<column> [<unit>]`); the old database's id and *_units columns and its
  filename column (the CIF name; the download is `<name>.cif`) are not kept.
- src/MofsExplorer/config.js, against the old YAML: "Diamater of largest free
  sphere" spelled right (unit A, as in the CSV); the adsorbaphore "N/A" in the
  old grey (#778899), as the YAML's "None" never matched the data; figure_top
  keeps the old filters (topology is a column there, but not a filter).

Sizes and time: see README.md.
"""

import csv
import gzip
import hashlib
import io
import json
import math
import os
import re
import shutil
import sys
import tarfile
import urllib.request
from concurrent.futures import ThreadPoolExecutor

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(APP, "raw")
OUT = os.path.join(APP, "public", "data")

RECORD = "nsp7v-2dk91"
API = f"https://archive.materialscloud.org/api/records/{RECORD}/files"
NEEDED = ["MOF_database.tar.gz", "screening_data.tar.gz"]
SCREENING = os.path.join(RAW, "screening_data.tar.gz")
STRUCTURES = os.path.join(RAW, "MOF_database.tar.gz")
ALL_CSV = "all_MOFs_screening_data.csv"
TOP_CSV = "top_MOFs_screening_data.csv"

SHARDS = 16384
SHARDS_PER_JOB = 64  # shards per job (~1,270 MOFs); the jobs run in parallel
GZIP_LEVEL = 6  # level 9: 3x slower for 4% smaller files
PART_ROWS = 100_000
MAX_FILE_BYTES = 25 * 1024 * 1024  # Cloudflare Pages limit per file
MAX_FILES = 20000  # ... and per deployment
EXPECTED_MOFS = 324426  # rows of all_MOFs_screening_data.csv = CIF files
EXPECTED_TOP = 8206
DECIMALS = 5  # the smallest non-zero value in the CSV is 0.0025: >= 3 significant digits kept

# The old figure_top's bad_names: the MOFs whose Henry coefficients are empty.
OLD_TOP_BAD = {
    "str_m2_o1_o23_pcu_sym.119", "str_m2_o1_o25_pcu_sym.248",
    "str_m2_o41_o41_fof_sym.30", "str_m2_o40_o41_fof_sym.67",
    "str_m2_o1_o25_pcu_sym.178", "str_m2_o1_o13_pcu_sym.213",
    "str_m2_o1_o9_pcu_sym.164", "str_m2_o1_o1_pcu_sym.28",
}

# The topology values of columns.yml (the CSVs hold a subset of them)
TOPOLOGY = ["sra", "pcu", "fof", "acs", "bcu", "pts", "the", "tbo", "nbo", "etb", "rht"]
# adsorbaphore_label: the CSV's "N/A" is the "None" of the old presets.yml
ADSORBAPHORE = ["A1", "A1+A2", "A2", "A3", "N/A"]

# The plotted columns of each figure: (key, kind, spec). "float": numbers, the
# third item is the unit to pick when the key has several (None: the only one);
# "category": codes into a values list (the spec). Every column of the old
# columns.yml, filters.yml and presets.yml of each figure.
FIGURES = {
    "all": {
        "csv": ALL_CSV,
        "columns": [
            ("topology", "category", TOPOLOGY),
            ("CO2/N2_selectivity", "float", None),
            ("void_fraction", "float", None),
            ("largest_free_sphere_diameter", "float", None),
            ("working_capacity_vacuum_swing", "float", None),
            ("surface_area", "float", None),
        ],
    },
    "top": {
        "csv": TOP_CSV,
        "columns": [
            ("CO2/N2_selectivity", "float", None),
            ("void_fraction", "float", None),
            ("largest_free_sphere_diameter", "float", None),
            ("working_capacity_vacuum_swing", "float", None),
            ("surface_area", "float", None),
            ("henry_coefficient_CO2_298K", "float", None),
            ("henry_coefficient_H2O_298K", "float", None),
            ("adsorbaphore_label", "category", ADSORBAPHORE),
        ],
    },
}


def shard_of(name):
    h = 0x811C9DC5
    for byte in name.encode("utf-8"):
        h = ((h ^ byte) * 0x01000193) & 0xFFFFFFFF
    return h % SHARDS


def column_key(label):
    """import_db.rename_columns(): (key, unit or None). MOFname is name."""
    label = label.strip()
    unit_regex = re.compile(r"\[(.*?)\]")
    match = unit_regex.search(label)
    if match:
        key, unit = unit_regex.sub("", label).strip().replace(" ", "_"), match.group(1).strip()
    else:
        key, unit = label.replace(" ", "_"), None
    return ("name" if key == "MOFname" else key), unit


def md5_of(path):
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def archive_checksums():
    with urllib.request.urlopen(API) as response:
        entries = json.load(response)["entries"]
    return {e["key"]: e["checksum"].removeprefix("md5:") for e in entries}


def fetch_raw(verify):
    os.makedirs(RAW, exist_ok=True)
    missing = [f for f in NEEDED if not os.path.exists(os.path.join(RAW, f))]
    to_check = NEEDED if verify else missing
    if not to_check:
        return
    sums = archive_checksums()
    for name in to_check:
        path = os.path.join(RAW, name)
        if name in missing:
            print(f"downloading {name} ...")
            part = path + ".part"
            with urllib.request.urlopen(f"{API}/{name}/content") as response, open(part, "wb") as out:
                shutil.copyfileobj(response, out, 1 << 20)
            os.replace(part, path)
        if md5_of(path) != sums[name]:
            sys.exit(f"md5 mismatch for raw/{name}: expected {sums[name]}")
        print(f"md5 ok: {name}")


def read_csv(tar, member):
    """(keys, units, rows): the CSV's header renamed, rows as lists of str."""
    text = io.TextIOWrapper(tar.extractfile(member), encoding="utf-8", newline="")
    reader = csv.reader(text, skipinitialspace=True)
    header = next(reader)
    rows = list(reader)
    keyed = [column_key(h) for h in header]
    keys = [k for k, _ in keyed]
    units = [u for _, u in keyed]
    assert len(set(zip(keys, units))) == len(keys), "duplicate (key, unit)"
    return keys, units, rows


def read_screening():
    """{csv name: (keys, units, rows)} for the two figures."""
    with tarfile.open(SCREENING) as tar:
        members = {os.path.basename(m.name): m for m in tar.getmembers() if m.isfile() and not os.path.basename(m.name).startswith("._")}
        return {name: read_csv(tar, members[name]) for name in (ALL_CSV, TOP_CSV)}


def read_cifs():
    """{name: the CIF text as it is in the archive}"""
    cifs = {}
    with tarfile.open(STRUCTURES) as tar:
        for member in tar:
            base = os.path.basename(member.name)
            if not member.isfile() or base.startswith("._") or not base.endswith(".cif"):
                continue
            cifs[base[: -len(".cif")]] = tar.extractfile(member).read().decode("utf-8")
    return cifs


def number(text):
    """int, or float rounded to DECIMALS places, or None if text is not a finite number."""
    if re.fullmatch(r"-?\d+", text):
        return int(text)
    try:
        value = float(text)
    except ValueError:
        return None
    return round(value, DECIMALS) if math.isfinite(value) else None


def write_json(path, value):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(value, f, separators=(",", ":"))


def write_text_gz(path, text):
    # mtime=0 and no file name in the header: the same bytes every run
    with open(path, "wb") as raw, gzip.GzipFile(filename="", fileobj=raw, mode="wb", compresslevel=GZIP_LEVEL, mtime=0) as f:
        f.write(text.encode("utf-8"))


def read_json_gz(path):
    with gzip.open(path, "rb") as f:
        return json.loads(f.read().decode("utf-8"))


def column_index(keys, units):
    index = {}
    for i, (k, u) in enumerate(zip(keys, units)):
        index.setdefault(k, {})[u] = i
    return index


def select_rows(keys, units, rows, columns):
    """The indices of the rows to plot, and the names left out and why."""
    index = column_index(keys, units)
    void = index["void_fraction"][None]
    name_col = keys.index("name")
    kept, missing, negative_void = [], [], []
    for i, r in enumerate(rows):
        values_ok = all(number(r[index[k][spec if spec else next(iter(index[k]))]]) is not None
                        for k, kind, spec in columns if kind == "float")
        if not values_ok:
            missing.append(r[name_col])
        elif number(r[void]) < 0:
            negative_void.append(r[name_col])
        else:
            kept.append(i)
    return kept, missing, negative_void


def build_part(keys, units, rows, columns, indices):
    index = column_index(keys, units)
    numeric, categories = {}, {}
    names = [rows[i][keys.index("name")] for i in indices]
    for key, kind, spec in columns:
        if kind == "float":
            by_unit = index[key]
            column = by_unit[spec] if spec else next(iter(by_unit.values()))
            numeric[key] = [float(number(rows[i][column])) for i in indices]
        else:
            (column,) = index[key].values()
            raw = [rows[i][column] for i in indices]
            assert set(raw) <= set(spec), f"{key}: unexpected values {set(raw) - set(spec)}"
            where = {v: c for c, v in enumerate(spec)}
            categories[key] = {"values": list(spec), "codes": [where[v] for v in raw]}
    return {"n": len(indices), "names": names, "columns": numeric, "categories": categories}


def detail_properties(keys, units, row):
    props = {}
    for k, u, text in zip(keys, units, row):
        value = number(text)
        props[k if u is None else f"{k} [{u}]"] = text if value is None else value
    return props


def write_shards(first, names_by_shard, cifs, properties):
    """shards first .. first + SHARDS_PER_JOB - 1, written gzipped; returns {shard: number of entries}"""
    counts = {}
    for i in range(first, min(first + SHARDS_PER_JOB, SHARDS)):
        entries = {n: {"properties": properties(n), "cif": cifs[n]} for n in names_by_shard[i]}
        write_text_gz(os.path.join(OUT, "details", f"{i:03x}.json.gz"), json.dumps(entries, separators=(",", ":")))
        counts[i] = len(entries)
    return counts


def main():
    fetch_raw("--verify" in sys.argv)
    screening = read_screening()
    all_keys, all_units, all_rows = screening[ALL_CSV]
    top_keys, top_units, top_rows = screening[TOP_CSV]
    print(f"{len(all_rows)} MOFs, {len(all_keys)} columns; {len(top_rows)} top MOFs, {len(top_keys)} columns")
    assert len(all_rows) == EXPECTED_MOFS and len(top_rows) == EXPECTED_TOP
    cifs = read_cifs()
    print(f"{len(cifs)} CIFs")

    name_col = all_keys.index("name")
    names = [r[name_col] for r in all_rows]
    assert len(set(names)) == len(names), "duplicate names"
    assert set(names) == set(cifs), "names and CIFs differ"
    top_name_col = top_keys.index("name")
    top_by_name = {r[top_name_col]: r for r in top_rows}
    assert set(top_by_name) <= set(names), "top MOF not in the full table"
    all_by_name = {r[name_col]: r for r in all_rows}

    # the rows of each figure, and the checks of the old app's data
    plots = {}
    for figure, spec in FIGURES.items():
        keys, units, rows = screening[spec["csv"]]
        kept, missing, negative_void = select_rows(keys, units, rows, spec["columns"])
        if figure == "all":
            assert not missing, f"plotted values missing: {missing[:5]}"
        else:
            assert set(missing) == OLD_TOP_BAD, f"top rows with missing values differ: {sorted(missing)}"
        print(f"{figure}: {len(kept)} MOFs plotted; left out {len(negative_void)} (void_fraction < 0), {len(missing)} (missing values)")
        plots[figure] = (keys, units, rows, kept)

    shutil.rmtree(OUT, ignore_errors=True)
    os.makedirs(os.path.join(OUT, "details"))
    counts = {}
    for figure, (keys, units, rows, kept) in plots.items():
        spec = FIGURES[figure]
        folder = os.path.join(OUT, "table", figure)
        os.makedirs(folder)
        parts = [kept[i : i + PART_ROWS] for i in range(0, len(kept), PART_ROWS)]
        for p, part in enumerate(parts):
            write_json(os.path.join(folder, f"{p:03d}.json"), build_part(keys, units, rows, spec["columns"], part))
        counts[figure] = (len(kept), len(parts))

    # details: one record per MOF of the full table; the top columns added for the top MOFs
    names_by_shard = [[] for _ in range(SHARDS)]
    for name in sorted(all_by_name):  # sorted by name within a shard: the output does not depend on the CSV order
        names_by_shard[shard_of(name)].append(name)
    all_props_keys = detail_properties(all_keys, all_units, all_rows[0]).keys()

    def properties(name):
        props = detail_properties(all_keys, all_units, all_by_name[name])
        if name in top_by_name:
            extra = detail_properties(top_keys, top_units, top_by_name[name])
            for k in extra:
                if k in props:
                    assert props[k] == extra[k], f"{name}: {k} differs between the tables"
                else:
                    props[k] = extra[k]
        return dict(sorted(props.items()))

    shard_counts = {}
    # threads: the compression (zlib) runs outside Python's lock
    with ThreadPoolExecutor(max_workers=os.cpu_count()) as pool:
        jobs = [pool.submit(write_shards, first, names_by_shard, cifs, properties) for first in range(0, SHARDS, SHARDS_PER_JOB)]
        for job in jobs:
            shard_counts.update(job.result())
            print(f"  details: {len(shard_counts)} of {SHARDS} shards", end="\r", flush=True)
    print()

    # self-check, from the files as written: every shard there, sizes; a sample read in full
    files = [os.path.join(d, f) for d, _, fs in os.walk(OUT) for f in fs]
    sizes = [os.path.getsize(f) for f in files]
    parts_total = sum(parts for _, parts in counts.values())
    assert len(files) == SHARDS + parts_total and len(files) < MAX_FILES, f"{len(files)} files"
    assert max(sizes) < MAX_FILE_BYTES, f"file over 25 MiB: {max(sizes)}"
    assert sum(shard_counts.values()) == EXPECTED_MOFS
    for i in range(0, SHARDS, 97):
        shard = read_json_gz(os.path.join(OUT, "details", f"{i:03x}.json.gz"))
        assert len(shard) == shard_counts[i] and all(
            shard_of(n) == i
            and v["cif"] == cifs[n]
            and len(v["properties"]) >= len(all_props_keys)
            for n, v in shard.items()
        ), f"shard {i:03x}"
    for figure, (n, parts) in counts.items():
        seen = 0
        for p in range(parts):
            with open(os.path.join(OUT, "table", figure, f"{p:03d}.json"), encoding="utf-8") as f:
                t = json.load(f)
            assert t["n"] == len(t["names"]) and all(len(c) == t["n"] for c in t["columns"].values())
            assert all(len(c["codes"]) == t["n"] for c in t["categories"].values())
            assert all(name in all_by_name for name in t["names"])
            seen += t["n"]
        assert seen == n

    shard_sizes = [os.path.getsize(os.path.join(OUT, "details", f"{i:03x}.json.gz")) for i in range(SHARDS)]
    mib = 1024 * 1024
    print(f"public/data/: {len(files)} files, {sum(sizes) / mib:.0f} MiB")
    for figure, (n, parts) in counts.items():
        print(f"  table/{figure}/: {parts} part(s), {n} MOFs")
    print(f"  details/: {SHARDS} shards, {min(shard_sizes) / mib:.2f} to {max(shard_sizes) / mib:.2f} MiB")


if __name__ == "__main__":
    main()

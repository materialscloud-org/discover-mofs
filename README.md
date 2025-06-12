# LSMO property visualizer app

Using

- bokeh server
- sqlite backend
  (AiiDA backend in alpha)

## Configuration

The plots can be configured using yml files:

- `figure/filters.yml`: defines available filters
- `figure/presets.yml`: defines presets for axis + filter settings

## Data

The data is availble on the [Materials Cloud Archive](https://archive.materialscloud.org/record/2018.0016/v3). Place both the MOF_database.tar.gz and screening_data.tar.gz inside the data directory and run ./prepare.sh. This will unzip and build the database.

## Installation

```
pip install -e .
./prepare.sh
./serve-app.sh
bokeh serve --show figure figure_top detail
```

## Docker

The docker image should build successfully with;
the database.db, and all cif files present in data/structures.

If this is not the case,
the database can be built from the [archive data](https://archive.materialscloud.org/record/2018.0016/v3).

Simply place the MOF_database.tar.gz and screening_data.tar.gz inside the data dir and run:

```
pip install -e . # Python3.7.15
./prepare.sh
```

If the correct data dir containing; database.db, 2 csvs and a large structures dir.
The docker image can be built with all the data inside with

```
docker compose build
docker compose up
# open http://localhost:3247/select-figure
```

A built version of this docker image can be found on the private mc-Harbor docker registry.

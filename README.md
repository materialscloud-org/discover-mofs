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

```
pip install -e . # May be required to build db.
./prepare.sh
docker compose build
docker compose up
# open http://localhost:3247/mofs/select-figure
```

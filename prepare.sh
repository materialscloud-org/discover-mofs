#!/bin/bash

cd data/

# Download data
export base_url=https://archive.materialscloud.org/preview_file/afa9ec805767a4da2bdaf4abf774f2ba163d74540d06318c; \
    wget ${base_url}/MOF_database.tar.gz &&\
    wget ${base_url}/screening_data.tar.gz

# Extract data
mkdir -p structures
tar xf MOF_database.tar.gz -C structures/ && rm MOF_database.tar.gz && \
    tar xf screening_data.tar.gz  && rm screening_data.tar.gz

cd ..

# Create sqlite DB
python import_db.py

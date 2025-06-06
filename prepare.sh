#!/bin/bash

cd data/

# Extract data
mkdir -p structures
tar xf MOF_database.tar.gz -C structures/ && \
    tar xf screening_data.tar.gz  &&

cd ..

# Create sqlite DB
python import_db.py

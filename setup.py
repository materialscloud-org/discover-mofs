#!/usr/bin/env python

from __future__ import absolute_import
from setuptools import setup

if __name__ == '__main__':
    # Provide static information in setup.json
    # such that it can be discovered automatically
    setup(
        packages=["detail", "figure"],
        name="discover-mofs",
        author="Leopold Talirz",
        author_email="info@materialscloud.org",
        description="bokeh application for MOF discover section.",
        license="MIT",
        classifiers=["Programming Language :: Python"],
        version="0.1.0",
        install_requires=[
            "bokeh~=1.3.4", "jsmol-bokeh-extension~=0.2.1", "pandas~=1.3.1",
            "sqlalchemy~=1.3.0", "ruamel.yaml~=0.16.5", "requests~=2.26.0"
        ],
        extras_require={"pre-commit": ["pre-commit~=2.2.0", "pylint~=2.6.0"]})

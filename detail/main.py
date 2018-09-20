# -*- coding: utf-8 -*-
from os.path import dirname, join
import bokeh.models as bmd
from bokeh.io import curdoc
from bokeh.layouts import layout

from detail import tab_detail

html = bmd.Div(
    text=open(join(dirname(__file__), "description.html")).read(), width=800)

# Create each of the tabs
tabs = bmd.widgets.Tabs(tabs=[tab_detail()])

# Put the tabs in the current document for display
curdoc().title = "Covalent Organic Frameworks"
curdoc().add_root(layout([html, tabs]))

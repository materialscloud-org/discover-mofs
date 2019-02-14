# -*- coding: utf-8 -*-
# pylint: disable=unsubscriptable-object, too-many-locals
from __future__ import print_function
from bokeh.io import curdoc

#html = bmd.Div(
#    text=open(join(dirname(__file__), "static", "table.html")).read(),
#    width=960)
#curdoc().add_root(layout([html]))

# Put the tabs in the current document for display
curdoc().title = "Covalent Organic Frameworks"
curdoc().template_variables["figures"] = [
    {
        "link": "figure_top",
        "caption": "Henry coefficient H2O <i>vs</i> Henry coefficient CO2",
        "hover_text": "High-performing MOFs",
        "image": "top_mofs.png",
    },
    {
        "link": "figure",
        "caption": "Working Capacity <i>vs</i> CO2/N2 Selectivity",
        "hover_text": "All MOFs",
        "image": "mofs.png",
    },
]

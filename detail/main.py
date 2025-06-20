# -*- coding: utf-8 -*-
# pylint: disable=unsubscriptable-object, too-many-locals
from __future__ import print_function
from os.path import dirname, join
from copy import copy
from collections import OrderedDict
import json
import re

from bokeh.layouts import layout, widgetbox
import bokeh.models as bmd
from bokeh.models.widgets import PreText, Button
from bokeh.io import curdoc

from jsmol_bokeh_extension import JSMol
from import_db import get_cif_content
from detail.query import get_sqlite_data as get_data

html = bmd.Div(text=open(join(dirname(__file__), "description.html")).read(),
               width=800)

download_js = open(join(dirname(__file__), "static", "download.js")).read()

script_source = bmd.ColumnDataSource()

plot_info = PreText(text='', width=300, height=100)

btn_download_table = Button(label="Download json", button_type="primary")
btn_download_cif = Button(label="Download cif", button_type="primary")


def get_name_from_url():
    args = curdoc().session_context.request.arguments
    try:
        name = args.get('name')[0]
        if isinstance(name, bytes):
            name = name.decode()
    except (TypeError, KeyError):
        name = 'str_m5_o1_o18_sra_sym.36'

    return name


def get_table_from_url():
    args = curdoc().session_context.request.arguments
    try:
        table = args.get('table')[0]
        if isinstance(table, bytes):
            table = table.decode()
    except (TypeError, KeyError):
        table = 'mofs'

    return table


def table_widget(entry):
    from bokeh.models import ColumnDataSource
    from bokeh.models.widgets import DataTable, TableColumn

    entry_dict = copy(entry.__dict__)
    for k, _v in entry.__dict__.items():
        if k == 'id' or k == '_sa_instance_state':
            del entry_dict[k]

        # use _units keys to rename corresponding quantity
        if k[-6:] == '_units':
            prop = k[:-6]
            new_key = "{} [{}]".format(prop, entry_dict[k])
            del entry_dict[k]
            entry_dict[new_key] = entry_dict.pop(prop)

    # order entry dict
    entry_dict = OrderedDict([(k, entry_dict[k])
                              for k in sorted(list(entry_dict.keys()))])

    data = dict(
        labels=[str(k) for k in entry_dict],
        values=[str(v) for v in entry_dict.values()],
    )
    source = ColumnDataSource(data)

    columns = [
        TableColumn(field="labels", title="Properties"),
        TableColumn(field="values", title="Values"),
    ]
    data_table = DataTable(source=source,
                           columns=columns,
                           width=500,
                           height=570,
                           index_position=None,
                           fit_columns=False)

    json_str = json.dumps(entry_dict, indent=2)
    btn_download_table.callback = bmd.CustomJS(args=dict(
        string=json_str, filename=entry_dict['name'] + '.json'),
                                               code=download_js)

    return widgetbox(data_table)


cof_name = get_name_from_url()
entry = get_data(cof_name, plot_info, get_table_from_url())

# This method is unused in new docker implementation
def get_cif_content_from_os(filename):
    """Load CIF content via GET request from object store."""
    import requests

    url = "https://object.cscs.ch/v1/AUTH_b1d80408b3d340db9f03d373bbde5c1e/discover-mofs/structures/{}".format(
        filename)
    #print(url)
    data = requests.get(url)
    #print(str(data.content.decode()))
    return str(data.content.decode())


def postprocess_cif_for_jsmol(cif_str):
    """Remove bonds from CIF for jsmol.

    Some CIFs contain bonds which (for some reason) causes jsmol not to display the unit cell.
    """
    return re.sub(r'loop_\s*_geom_bond_atom.+', '', cif_str, flags=re.DOTALL)


#cif_str = get_cif_content_from_os(entry.filename)
cif_str = get_cif_content(entry.filename)

info = dict(
    height="100%",
    width="100%",
    use="HTML5",
    serverURL="detail/static/jsmol/php/jsmol.php",
    j2sPath="detail/static/jsmol/j2s",
    script="""set antialiasDisplay ON;
load data "cifstring"
{}
end "cifstring"
""".format(postprocess_cif_for_jsmol(cif_str))
    ## Note: Need PHP server for approach below to work
    #    script="""set antialiasDisplay ON;
    #load cif::{};
    #""".format(get_cif_url(entry.filename))
)

btn_download_cif.callback = bmd.CustomJS(args=dict(string=cif_str,
                                                   filename=entry.filename),
                                         code=download_js)

applet = JSMol(
    width=600,
    height=600,
    script_source=script_source,
    info=info,
    js_url="detail/static/jsmol/JSmol.min.js",
)

sizing_mode = 'fixed'
ly = layout([
    [
        [[applet], [btn_download_cif]],
        [[table_widget(entry)], [btn_download_table]],
    ],
    [plot_info],
],
            sizing_mode=sizing_mode)

# We add this as a tab
tab = bmd.Panel(child=ly, title=cof_name)
tabs = bmd.widgets.Tabs(tabs=[tab])

# Put the tabs in the current document for display
curdoc().title = "Metal-Organic Frameworks"
curdoc().add_root(layout([html, tabs]))

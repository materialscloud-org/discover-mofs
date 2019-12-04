"""Querying the DB
"""
from bokeh.models.widgets import RangeSlider, CheckboxButtonGroup
from figure.config import max_points
# pylint: disable=too-many-locals
data_empty = dict(x=[0], y=[0], uuid=['1234'], color=[0], name=['no data'])


def get_data_sqla(projections, sliders_dict, quantities, plot_info):
    """Query database using SQLAlchemy.
    
    Note: For efficiency, this uses the the sqlalchemy.sql interface which does
    not go via the (more convenient) ORM.
    """
    from import_db import automap_table, engine
    from sqlalchemy.sql import select, and_

    Table = automap_table(engine, table_name='mofs')

    selections = []
    for label in projections:
        selections.append(getattr(Table, label))

    filters = []
    for k, v in sliders_dict.items():
        if isinstance(v, RangeSlider):
            if not v.value == quantities[k]['range']:
                f = getattr(Table, k).between(v.value[0], v.value[1])
                filters.append(f)
        elif isinstance(v, CheckboxButtonGroup):
            if not len(v.active) == len(v.labels):
                f = getattr(Table, k).in_([v.tags[i] for i in v.active])
                filters.append(f)

    # Leopold: Some structures have void_fraction = -1
    # Pete: Likely, some structures do not have measurable pores using zeo++.
    # This doesn't necessarily mean 0 uptake however, as zeo++ uses hard
    # spheres to measure pore space, while a lennard-jones function governs the
    # adsorption measured by GCMC.
    # The selectivity ratio would be high in these cases, as even slight CO2
    # adsorption but significantly less N2 will yield a high selectivity. I
    # think I filtered these cases out of the plot, as they would be
    # uninteresting from a materials design point of view.
    filters.append(Table.void_fraction >= 0)

    s = select(selections).where(and_(*filters))

    results = engine.connect().execute(s).fetchall()

    nresults = len(results)
    if not results:
        plot_info.text = "No matching MOFs found."
        return data_empty
    elif nresults > max_points:
        results = results[:max_points]
        plot_info.text = "{} MOFs found.\nPlotting {}...".format(
            nresults, max_points)
    else:
        plot_info.text = "{} MOFs found.\nPlotting {}...".format(
            nresults, nresults)

    # x,y position
    x, y, clrs, names, filenames = zip(*results)
    x = list(map(float, x))
    y = list(map(float, y))

    if projections[2] == 'bond_type':
        #clrs = map(lambda clr: bondtypes.index(clr), clrs)
        clrs = list(map(str, clrs))
    else:
        clrs = list(map(float, clrs))

    return dict(x=x, y=y, filename=filenames, color=clrs, name=names)

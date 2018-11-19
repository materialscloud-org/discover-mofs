import collections
import yaml
from os.path import join, dirname

static_dir = join(dirname(__file__), "static")

with open(join(static_dir, "columns.yml"), 'r') as f:
    quantity_list = yaml.load(f)

quantities = collections.OrderedDict([(q['column'], q) for q in quantity_list])

plot_quantities = [
    q for q in quantities.keys() if quantities[q]['type'] == 'float'
]

with open(join(static_dir, "filters.yml"), 'r') as f:
    filter_list = yaml.load(f)

with open(join(static_dir, "presets.yml"), 'r') as f:
    presets = yaml.load(f)

for k in presets.keys():
    if 'clr' not in presets[k].keys():
        presets[k]['clr'] = presets['default']['clr']

max_points = 30000


class Quantity(object):
    """Helper functions for plotting a quantity"""

    def __init__(self, quantity_str):
        self.quantity = quantities[quantity_str]

    @property
    def label(self):
        return self.quantity['label']

    @property
    def unit(self):
        try:
            return self.quantity['unit']
        except KeyError:
            return None

    @property
    def unit_str(self):
        u = self.unit
        if u is None:
            return ""
        return "[{}]".format(u)

    @property
    def axis_label(self):
        return "{} {}".format(self.label, self.unit_str)

    @property
    def colors(self):
        try:
            return self.quantity['colors']
        except KeyError:
            return None

    @property
    def values(self):
        try:
            return self.quantity['values']
        except KeyError:
            return None

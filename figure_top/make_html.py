from config import presets

for preset in presets:
    pdict = presets[preset]
    print("""
  <td>
    <a href="figure?preset={p}">
    <figure>
      <img class="figure-thumbnail" src="select-figure/static/images/{p}.png">
      <figcaption>
        <b>Figure {p}</b>
        {y} vs {x}
      </figcaption>
    </figure>
    </a>
  </td>
""".format(p=preset, x=pdict['x'], y=pdict['y']))

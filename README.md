# Metal-Organic Frameworks

Interactive exploration of 324,426 hypothetical metal-organic frameworks
(MOFs) screened for CO2 capture: scatter plots of their computed properties (all
MOFs, and the high-performing ones), and a page with the structure and all
properties of each MOF.
Data: [doi:10.24435/materialscloud:2018.0016/v3](https://doi.org/10.24435/materialscloud:2018.0016/v3)
(Materials Cloud Archive record `nsp7v-2dk91`).

A static single-page app, the port of the Bokeh "discover-mofs" section of
Materials Cloud (the old app is commit [`3e20e9c`](https://github.com/materialscloud-org/discover-mofs/tree/3e20e9c) of this
repository; data decisions are documented in `scripts/prepareForFrontend.py`).

## Development

This app was migrated to a single page app, with the intention of providing users a serverless way to explore this data.

The legacy software, with tools to containerize it (which may be out of date), is commit [`3e20e9c`](https://github.com/materialscloud-org/discover-mofs/tree/3e20e9c) of this repository.

If you would like to launch the Single Page App locally:

```bash
pnpm install
python3 scripts/prepareForFrontend.py # about 3 minutes, ~6 GB memory
pnpm dev        # http://localhost:5173 (needs public/data/)
pnpm test       # node --test tests/*.test.mjs
pnpm lint
pnpm build      # static site in dist/ (copies public/data/: 1.5 GB)
```

## Deployment

The app is currently deployed by hand to Cloudflare Pages with wrangler with no CI/CD, so changes have to be pushed to materialscloud cloudflare. This is because of the sharding strategy used and that the data is too large for git and comes from the Materials Cloud Archive.

```bash
python3 scripts/prepareForFrontend.py  # if data is missing
pnpm build
npx wrangler pages deploy dist --project-name discover-mofs
```

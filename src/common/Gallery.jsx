// The landing page: figure thumbnails, the default figure alone on top.
import { Link } from "react-router-dom";

const IMAGES = `${import.meta.env.BASE_URL}images/`;

/** "Deliverable Capacity vs Density (3d COFs)", the vs in italics */
const Caption = ({ caption: { y, x, note } }) => (
  <>
    {y} <i>vs</i> {x}
    {note && ` ${note}`}
  </>
);

function Figure({ to, image, label, caption }) {
  return (
    <figure className="space-y-1 text-center">
      {/* the title over the image on hover, as on the old page */}
      <Link to={to} title={label} className="group relative block">
        <img
          src={`${IMAGES}${image}.png`}
          alt={label}
          className="mx-auto w-full rounded shadow"
        />
        {/*figure title on hover  Blue with white bg*/}
        <span className="absolute inset-0 flex items-center justify-center rounded bg-white/70 text-xl font-bold text-blue opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          {label}
        </span>
      </Link>
      <figcaption className="text-sm pt-2">
        <b>{label}</b>
        <br />
        <Caption caption={caption} />
      </figcaption>
    </figure>
  );
}

// one column, two, then three (gap-8 = 2rem between items)
const ITEM = "w-full sm:w-[calc((100%_-_2rem)/2)] lg:w-[calc((100%_-_4rem)/3)]";

export default function Gallery({ config }) {
  return (
    <div className="space-y-8 px-2 pb-6 sm:px-8">
      <p>
        Click on a figure for the <b>interactive plot</b>.
      </p>
      {/* rows of 1 (the default figure), then 3, 3, 1: centred flex rows, items a third wide */}
      <div className="flex justify-center px-20">
        <div className={ITEM}>
          <Figure
            to="/figure"
            image={config.defaultPreset}
            label={config.galleryDefault.title}
            caption={config.galleryDefault.caption}
          />
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-8">
        {config.gallery.map(({ key, caption }) => (
          <div key={key} className={ITEM}>
            <Figure
              to={`/figure?preset=${encodeURIComponent(key)}`}
              image={key}
              label={`Figure ${key}`}
              caption={caption}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

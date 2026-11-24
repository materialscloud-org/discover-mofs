// Pieces shared by the pages.
import { McloudSpinner } from "mc-react-library";
import { useLocation, useNavigate } from "react-router-dom";

export function Loading() {
  return (
    <div className="flex justify-center py-10">
      <McloudSpinner />
    </div>
  );
}

export function Failed({ error }) {
  return (
    <p className="py-4 text-red-700">
      Could not load the data: {String(error?.message ?? error)}
    </p>
  );
}

const BUTTON =
  "inline-block rounded bg-[#0d6efd] px-3 py-1 text-sm text-white hover:bg-[#0b5ed7] hover:text-white hover:no-underline"; // as mc-react-library's DownloadDropdown

/** a button that saves `text` as a file in the browser */
export function DownloadButton({
  filename,
  text,
  mime = "text/plain",
  children,
}) {
  const save = () => {
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    const link = Object.assign(document.createElement("a"), {
      href: url,
      download: filename,
    });
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <button type="button" onClick={save} className={BUTTON}>
      {children}
    </button>
  );
}

const ArrowLeft = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </svg>
);

/** "Back": to the previous page of the app, or its home page when opened directly (no app history) */
export function BackButton() {
  const navigate = useNavigate();
  const { key } = useLocation();
  return (
    <button
      type="button"
      onClick={() => (key === "default" ? navigate("/") : navigate(-1))}
      className={`${BUTTON} inline-flex items-center gap-1`}
    >
      <ArrowLeft />
      Back
    </button>
  );
}

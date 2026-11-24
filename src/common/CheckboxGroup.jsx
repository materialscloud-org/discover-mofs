// A group of toggle checkboxes: `selected` is the list of checked `values`.
import { useId } from "react";

export default function CheckboxGroup({ label, values, labels = values.map(String), selected, onChange }) {
  const id = useId();
  const toggle = (v) => onChange(values.filter((x) => (x === v ? !selected.includes(x) : selected.includes(x))));
  return (
    <div role="group" aria-labelledby={id} className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <span id={id} className="text-sm">
        {label}
      </span>
      {values.map((v, i) => (
        <label key={String(v)} className="flex items-center gap-1 text-sm">
          <input type="checkbox" checked={selected.includes(v)} onChange={() => toggle(v)} />
          {labels[i]}
        </label>
      ))}
    </div>
  );
}

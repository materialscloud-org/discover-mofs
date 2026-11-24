// The information accordions of the home page.
import { DoiBadge, McInfoAccordions } from "mc-react-library";

function AboutContent() {
  return (
    <div className="space-y-2">
      <p>
        We present a database of 324,426 hypothetical Metal-Organic Frameworks (MOFs) screened for potential carbon
        dioxide scrubbers. Using a method to assemble these materials with topological blueprints, we only selected
        materials that could be accurately represented with the MEPO-QEq charge generation method. By ensuring that the
        electrostatic potential is accurately represented in these materials, screening for CO<sub>2</sub> adsorption properties
        should result in very few false positives/negatives.
      </p>
      <p>
        Post-combustion flue gas was simulated at a temperature of both 298K and 0.15 bar CO<sub>2</sub>, and 313K and 0.15 bar
        CO<sub>2</sub>. Mixture adsorption was simulated with the conditions 298K and 0.15:0.85 CO<sub>2</sub>/N<sub>2</sub> with a total pressure of 1
        bar. We report working capacities, i.e. the difference of adsorption of CO<sub>2</sub> between two thermodynamic state
        points. The adsorption state point(s) are mentioned above, and two desorption values were simulated;
      </p>
      <ul className="list-disc pl-8">
        <li>0.1 bar CO<sub>2</sub> at 363K (vacuum swing adsorption) and 0.7 bar CO<sub>2</sub> at 413K (temperature swing adsorption).</li>
      </ul>
      <p>
        Over 8,000 materials were selected for more refined simulations, including re-defining partial atomic charges
        with the REPEAT method, and more detailed simulations to obtain common chemical patterns surrounding CO<sub>2</sub> binding
        sites (adsorbaphores).
      </p>
      <p>
        The interactive figure allows to explore the full database of assembled structures, together with their
        properties. All structures and properties can be downloaded in bulk from the Materials Cloud archive entry
        linked above.
      </p>
    </div>
  );
}

function HowToCiteContent() {
  return (
    <p>
      Please find the appropriate journal reference in{" "}
      <span className="inline-block align-middle">
        <DoiBadge doi_id="2018.0016/v3" label="Data DOI" />
      </span>
      .
    </p>
  );
}

const ACCORDIONS = [
  { title: "About", content: <AboutContent /> },
  { title: "How to cite", content: <HowToCiteContent /> },
];

/** The information accordions, one open at a time. */
export default function InfoAccordions() {
  return <McInfoAccordions items={ACCORDIONS} />;
}

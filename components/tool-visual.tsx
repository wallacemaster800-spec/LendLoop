/** Category illustrations, not photographs of the listed items. */
export function ToolVisual({ category }: { category: string }) {
  return (
    <svg className="product-illustration" viewBox="0 0 300 210" aria-hidden="true">
      <ellipse cx="150" cy="181" rx="85" ry="10" fill="#18324b" opacity=".09" />
      {category === "Power tools" ? (
        <g stroke="#24364b" strokeWidth="4" strokeLinejoin="round">
          <path d="M69 58h112l23 20v45l-24 17h-55l-12 29H76l17-65-24-10z" fill="#e9b443" />
          <path d="M204 81h25v35h-25zM229 90h28v16h-28z" fill="#64748b" />
          <path d="M83 162h47l7 19H74z" fill="#293b51" />
          <path d="M86 74h69m-69 12h58m-51 56h25" fill="none" />
          <circle cx="180" cy="99" r="10" fill="#24364b" />
        </g>
      ) : category === "Camping" ? (
        <g stroke="#385660" strokeWidth="3" strokeLinejoin="round">
          <path d="M43 174 143 40l114 134z" fill="#779e8b" />
          <path d="m143 40 27 134H43z" fill="#a7c6ae" />
          <path d="m141 86 18 88H81z" fill="#263d47" />
          <path d="M28 180 143 40l128 140" fill="none" />
        </g>
      ) : category === "Kitchen" ? (
        <g stroke="#38485d" strokeWidth="3">
          <path d="M96 65q0-25 30-25h53q29 0 29 25v26H97z" fill="#d78672" />
          <path d="M100 86h26v78h67v18H92z" fill="#d78672" />
          <path d="M140 111h82q-2 59-41 59t-41-59z" fill="#cad4dc" />
          <path d="M180 86v38m-11-1 11 14 11-14" fill="none" />
          <circle cx="118" cy="63" r="7" fill="#f6f0e9" />
        </g>
      ) : category === "Garden" ? (
        <g stroke="#344c45" strokeWidth="5" strokeLinejoin="round">
          <path d="m111 50 51 107" fill="none" />
          <path d="m95 37 21-10 13 27-21 10z" fill="#d2a77b" />
          <path d="m139 144 39-19 20 41q-17 29-38 20z" fill="#7c9d8b" />
          <path d="m191 43-67 130" stroke="#b18659" strokeWidth="10" />
          <path d="m102 160 34 17-14 24-35-17z" fill="#687c78" />
        </g>
      ) : category === "Hand tools" ? (
        <g stroke="#344155" strokeWidth="4" strokeLinejoin="round">
          <path d="m119 68 30-13 43 113q3 13-11 18t-19-6z" fill="#c79863" />
          <path d="m83 55 69-25 29 30-25 12-19-11-42 21z" fill="#99a9b5" />
          <path d="m193 65 19 6-37 100-18-7z" fill="#ddac4c" />
          <path d="m210 53 7-19 9 4-7 19z" fill="#8395a3" />
        </g>
      ) : (
        <g stroke="#435875" strokeWidth="3">
          <path d="m83 71 65-28 71 28v91l-71 25-65-25z" fill="#c8b08e" />
          <path d="m83 71 65 25 71-25m-71 25v91m-32-130 68 25v28l-18 7V88" fill="none" />
        </g>
      )}
    </svg>
  );
}

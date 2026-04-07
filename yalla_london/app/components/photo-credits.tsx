/**
 * Unsplash Photo Credits — Required by Unsplash License
 *
 * Renders a subtle credits line at the bottom of any page using Unsplash images.
 * Format: "Photos by Name, Name, Name on Unsplash"
 * All names link to photographer profiles with required UTM params.
 *
 * Usage:
 *   <PhotoCredits photographers={[
 *     { name: "John Doe", username: "johndoe" },
 *   ]} />
 */

interface Photographer {
  name: string;
  username: string;
}

export function PhotoCredits({
  photographers,
  className = "",
}: {
  photographers: Photographer[];
  className?: string;
}) {
  if (photographers.length === 0) return null;

  // Deduplicate by username
  const unique = photographers.filter(
    (p, i, arr) => arr.findIndex((x) => x.username === p.username) === i
  );

  return (
    <p
      className={`text-[11px] text-center opacity-40 py-3 ${className}`}
      style={{ fontFamily: "'Montserrat', sans-serif", letterSpacing: "0.02em" }}
    >
      Photos by{" "}
      {unique.map((p, i) => (
        <span key={p.username}>
          <a
            href={`https://unsplash.com/@${p.username}?utm_source=zenitha_luxury&utm_medium=referral`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:opacity-80"
          >
            {p.name}
          </a>
          {i < unique.length - 1 ? ", " : ""}
        </span>
      ))}{" "}
      on{" "}
      <a
        href="https://unsplash.com/?utm_source=zenitha_luxury&utm_medium=referral"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:opacity-80"
      >
        Unsplash
      </a>
    </p>
  );
}

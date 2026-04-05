import React from "react";
import { BRAND, TricolorBar, Wordmark, Footer } from "../brand";

/**
 * StoryOverlay — persistent overlay (no animation), for ProRes 4444 alpha export.
 * Tricolor bar top, wordmark top-left (small), footer bottom.
 */
export const StoryOverlay: React.FC<{
  durationInFrames: number;
  [key: string]: unknown;
}> = () => {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "transparent",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        position: "relative",
      }}
    >
      {/* Top section */}
      <div>
        <TricolorBar startFrame={-999} />
        <div style={{ padding: "16px 24px" }}>
          <Wordmark size="sm" variant="dark" startFrame={-999} />
        </div>
      </div>

      {/* Bottom footer */}
      <div style={{ padding: "0 24px 24px 24px" }}>
        <Footer startFrame={-999} />
      </div>
    </div>
  );
};

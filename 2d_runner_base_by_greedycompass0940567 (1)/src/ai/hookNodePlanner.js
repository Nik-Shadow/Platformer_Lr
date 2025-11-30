// Planning smart hook node placement after platforms have been generated.

export function addSmartHookNodes(platforms, hookRadius, jumpHeight, unit) {
  const minVerticalGap = jumpHeight;
  const maxVerticalGap = hookRadius * 0.9;

  // Larger spacing radius to avoid clusters (6–8 units)
  const minSpacing = 6 * unit;
  const minSpacingSq = minSpacing * minSpacing;

  // Work on a shallow copy sorted by x to find neighbours
  const sorted = platforms
    .filter((p) => p.type !== "hookNode")
    .slice()
    .sort((a, b) => a.x - b.x);

  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i];
    const aTop = a.y;

    // Look for platforms above "a" that overlap in X
    for (let j = 0; j < sorted.length; j++) {
      const b = sorted[j];
      if (b.y >= aTop) continue; // not above

      const verticalGap = aTop - b.y;
      if (verticalGap <= minVerticalGap || verticalGap > maxVerticalGap) {
        continue;
      }

      // require horizontal overlap so the node is logically between them
      const overlapLeft = Math.max(a.x, b.x);
      const overlapRight = Math.min(a.x + a.width, b.x + b.width);
      if (overlapRight <= overlapLeft) continue;

      const midX = (overlapLeft + overlapRight) / 2;
      const midY = (aTop + b.y) / 2;

      // reduce spawn density: keep only about 40% of valid nodes
      if (Math.random() > 0.4) continue;

      // check if a hook node already exists close by (spacing radius)
      let tooClose = false;
      for (const p of platforms) {
        if (p.type === "hookNode") {
          const centerX = p.x + p.width / 2;
          const centerY = p.y;
          const dx = centerX - midX;
          const dy = centerY - midY;
          if (dx * dx + dy * dy < minSpacingSq) {
            tooClose = true;
            break;
          }
        }
      }
      if (tooClose) continue;

      // also avoid placing nodes too close to any platform top edge
      for (const plat of platforms) {
        if (plat.type === "hookNode") continue;
        const platLeft = plat.x;
        const platRight = plat.x + plat.width;
        const clampedX = Math.max(platLeft, Math.min(midX, platRight));
        const edgeY = plat.y;
        const dx = clampedX - midX;
        const dy = edgeY - midY;
        if (dx * dx + dy * dy < minSpacingSq) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;

      platforms.push({
        x: midX - unit * 0.25,
        y: midY,
        width: unit * 0.5,
        height: 8,
        type: "hookNode",
        hookable: true
      });
    }
  }
}
import { UNIT, HOOK_RADIUS, JUMP_HEIGHT_UNITS } from "./constants.js";

// Lazy import wrapper for AI generator to avoid circular deps issues
let _aiModule = null;
function awaitAiModule() {
  if (_aiModule) return _aiModule;
  // Static import path; bundler is not used so we keep it simple.
  // In this environment it will already be loaded, we just require it once.
  // eslint-disable-next-line no-undef
  _aiModule = { aiGenerateSection: window.__aiGenerateSection };
  return _aiModule;
}

export function createLevelManager(platforms, hazards, bonuses, speedState, player, boosters) {
  // base flat platform the old layout used
  const baseGroundY = 200;

  // Track generated sections so we can cull them later
  const sections = [];
  let nextSectionId = 1;

  let nextSectionStartX = platforms.length
    ? platforms[platforms.length - 1].x + platforms[platforms.length - 1].width
    : 40;

  function generateSection() {
    const { aiGenerateSection } = awaitAiModule();

    const {
      style,
      sectionStartX,
      sectionEndX,
      platforms: newPlatforms,
      hazards: newHazards,
      bonuses: newBonuses,
      boosters: newBoosters
    } = aiGenerateSection({
      nextSectionStartX,
      baseGroundY,
      unit: UNIT,
      difficulty: speedState.difficulty,
      hookRadius: HOOK_RADIUS,
      jumpHeight: JUMP_HEIGHT_UNITS * UNIT
    });

    const sectionId = nextSectionId++;

    nextSectionStartX = sectionEndX;
    speedState.lastStyle = style;

    // Tag generated objects with sectionId and push into global arrays
    for (const p of newPlatforms) {
      p.sectionId = sectionId;
      platforms.push(p);
    }
    for (const h of newHazards) {
      h.sectionId = sectionId;
      hazards.push(h);
    }
    for (const b of newBonuses) {
      b.sectionId = sectionId;
      bonuses.push(b);
    }
    if (newBoosters) {
      for (const bo of newBoosters) {
        bo.sectionId = sectionId;
        boosters.push(bo);
      }
    }

    sections.push({
      id: sectionId,
      startX: sectionStartX,
      endX: sectionEndX
    });
  }

  function cullOldSections() {
    const BACK_BUFFER = UNIT * 100; // keep a bit of level behind the player

    while (sections.length > 0) {
      const first = sections[0];
      const tooFarBehind = first.endX < player.x - BACK_BUFFER;
      const tooManySections = sections.length > 6;

      if (!tooFarBehind && !tooManySections) break;

      const removeId = first.id;

      // Remove all entities that belong to this section
      if (platforms.length) {
        const kept = platforms.filter(p => p.sectionId !== removeId);
        platforms.length = 0;
        platforms.push(...kept);
      }
      if (hazards.length) {
        const kept = hazards.filter(h => h.sectionId !== removeId);
        hazards.length = 0;
        hazards.push(...kept);
      }
      if (bonuses.length) {
        const kept = bonuses.filter(b => b.sectionId !== removeId);
        bonuses.length = 0;
        bonuses.push(...kept);
      }
      if (boosters.length) {
        const kept = boosters.filter(bo => bo.sectionId !== removeId);
        boosters.length = 0;
        boosters.push(...kept);
      }

      sections.shift();
    }
  }

  function update(dt) {
    // keep at least two sections ahead of the player
    const buffer = UNIT * 220;
    while (nextSectionStartX < player.x + buffer) {
      generateSection();
    }

    // update moving platforms
    for (const p of platforms) {
      if (p.type === "moving") {
        p.x += p.dir * p.speed * dt;
        if (p.x > p.originX + p.range) {
          p.x = p.originX + p.range;
          p.dir = -1;
        } else if (p.x < p.originX - p.range) {
          p.x = p.originX - p.range;
          p.dir = 1;
        }
      }
    }

    // update lasers blinking
    for (const h of hazards) {
      if (h.type === "laser") {
        h.phase += dt * (1.5 + speedState.difficulty * 0.4);
      }
    }

    // remove outdated sections behind the player and enforce max count
    cullOldSections();
  }

  function resetLayout() {
    // Called when dimension layout changes
    sections.length = 0;
    nextSectionId = 1;
    nextSectionStartX = platforms.length
      ? platforms[platforms.length - 1].x + platforms[platforms.length - 1].width
      : 40;
  }

  return {
    update,
    resetLayout
  };
}

function addSmartHookNodes(platforms, hookRadius, jumpHeight, unit) {
  const minVerticalGap = jumpHeight;
  const maxVerticalGap = hookRadius * 0.9;

  // approximate maximum horizontal jump distance using jump height
  const approximateMaxHorizontal = jumpHeight * 1.6;

  // Work on a shallow copy sorted by x to find neighbours
  const sorted = platforms
    .filter(p => p.type !== "hookNode")
    .slice()
    .sort((a, b) => a.x - b.x);

  // Vertical traversal nodes between stacked platforms
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

      // check if a hook node already exists close by
      const already = platforms.some(p =>
        p.type === "hookNode" &&
        Math.abs(p.x + p.width / 2 - midX) < unit &&
        Math.abs(p.y - midY) < unit
      );
      if (already) continue;

      // reduce spawn density: only keep roughly 40% of otherwise valid vertical nodes
      if (Math.random() > 0.4) continue;

      platforms.push({
        x: midX - (unit * 0.25),
        y: midY,
        width: unit * 0.5,
        height: 8,
        type: "hookNode",
        hookable: true
      });
    }
  }

  // Horizontal traversal nodes between platforms on the same layer
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];

    // same floor (approximately): y difference within half a unit
    if (Math.abs(a.y - b.y) > unit * 0.5) continue;

    const left = a.x < b.x ? a : b;
    const right = a.x < b.x ? b : a;

    const gapStart = left.x + left.width;
    const gapEnd = right.x;
    const gapWidth = gapEnd - gapStart;

    if (gapWidth <= 0) continue;

    // only consider very wide gaps that exceed a rough horizontal jump distance
    if (gapWidth <= approximateMaxHorizontal) continue;

    const midX = gapStart + gapWidth / 2;
    const midY = (left.y + right.y) / 2;

    // ensure the hook node remains inside hook radius vertically from at least one platform
    const closestPlatY = left.y;
    const verticalGapToNode = Math.abs(closestPlatY - midY);
    if (verticalGapToNode > maxVerticalGap) continue;

    const already = platforms.some(p =>
      p.type === "hookNode" &&
      Math.abs(p.x + p.width / 2 - midX) < unit &&
      Math.abs(p.y - midY) < unit
    );
    if (already) continue;

    // reduce spawn density and randomness for horizontal nodes too
    if (Math.random() > 0.4) continue;

    platforms.push({
      x: midX - (unit * 0.25),
      y: midY,
      width: unit * 0.5,
      height: 8,
      type: "hookNode",
      hookable: true
    });
  }
}
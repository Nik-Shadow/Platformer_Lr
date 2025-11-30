// Simple AI-assisted section generator.
// This module contains the full implementation of aiGenerateSection.

import { UNIT } from "../constants.js";
import { randRange, clamp } from "./util.js";
import {
  addSpikes,
  addLaser,
  addSaw,
  addJumpBooster,
  addSpeedBooster,
  addScoreItemOnPlatform,
  addScoreItemNearHazard,
  addFloatingScoreItem,
  addGrappleBoosterNearHazard,
  addFloatingGrappleBooster
} from "./sectionHelpers.js";
import { addSmartHookNodes } from "./hookNodePlanner.js";

export function aiGenerateSection(params) {
  const {
    nextSectionStartX,
    baseGroundY,
    unit,
    difficulty,
    hookRadius,
    jumpHeight
  } = params;

  // Pseudo-"AI" style choice based on difficulty and a bit of randomness
  const styles = ["factory", "station", "digital"];
  let styleIndex = difficulty % styles.length;
  if (Math.random() < 0.35) {
    styleIndex = (styleIndex + 1) % styles.length;
  }
  const style = styles[styleIndex];

  // Style influences average section length and obstacle density
  const baseMinLen = 200;
  const baseMaxLen = 300;

  let lengthBias = 0;
  let obstacleBias = 0;
  switch (style) {
    case "factory":
      lengthBias = 20;
      obstacleBias = 0.15;
      break;
    case "station":
      lengthBias = -10;
      obstacleBias = 0.05;
      break;
    case "digital":
      lengthBias = 40;
      obstacleBias = 0.2;
      break;
  }

  const sectionLengthUnits = Math.floor(
    randRange(baseMinLen + lengthBias, baseMaxLen + lengthBias)
  );
  const sectionLengthPx = sectionLengthUnits * unit;

  const sectionStartX = nextSectionStartX;
  const sectionEndX = sectionStartX + sectionLengthPx;

  const platforms = [];
  const hazards = [];
  const bonuses = [];
  const boosters = [];

  // simple cap on score item density per section
  let scoreItemCount = 0;
  const maxScoreItems = 18;

  // Ground strip with occasional style-dependent height tweaks
  let groundY = baseGroundY;
  if (style === "factory") {
    groundY += randRange(-10, 10);
  } else if (style === "station") {
    groundY += randRange(-5, 5);
  } else if (style === "digital") {
    groundY += randRange(-20, 0);
  }

  const lowerY = groundY;

  // Multi-layer vertical layout: 8–12 layers, spaced ~4 units apart
  const layerCount = Math.floor(randRange(8, 13)); // 8–12 inclusive
  const layerSpacingUnits = 4;
  const layerSpacing = layerSpacingUnits * unit;

  const layers = [];
  const layerOffsetRange = 0.4 * unit; // ±0.4 units vertical jitter per floor

  for (let i = 0; i < layerCount; i++) {
    let baseY = lowerY - i * layerSpacing;

    // Add small irregularity to non-ground floors while keeping progression
    if (i > 0) {
      const offset = randRange(-layerOffsetRange, layerOffsetRange);
      baseY += offset;
    }

    layers.push(baseY);
  }

  const baseGapChance = 0.05 + difficulty * 0.02 + obstacleBias * 0.2;

  // Generate platforms, traps, bonuses for each vertical layer
  for (let li = 0; li < layers.length; li++) {
    const layerY = layers[li];
    let x = sectionStartX;

    const isGroundLayer = li === 0;
    const layerGapChance = clamp(
      baseGapChance + (isGroundLayer ? 0 : 0.03 * li),
      0.05,
      0.45
    );

    while (x < sectionEndX) {
      const makeGap = Math.random() < layerGapChance;
      const segWidthUnits = Math.floor(randRange(10, 22));
      const segWidth = segWidthUnits * unit;

      if (!makeGap) {
        // Decide platform type: normal, thin, or trap (with saw)
        let platformType = "static";
        if (!isGroundLayer && Math.random() < 0.18) {
          platformType = "thin";
        }
        if (!isGroundLayer && Math.random() < 0.25) {
          platformType = "trap";
        }

        const platform = {
          x,
          y: layerY,
          width: segWidth,
          height: isGroundLayer ? 40 : platformType === "thin" ? 8 : 32,
          type: platformType === "trap" ? "trap" : platformType,
          hookable: true
        };
        platforms.push(platform);

        // Hazards / bonuses / boosters for this layer segment
        const baseObstacleDensity = 0.2 + difficulty * 0.1 + obstacleBias;
        const obstacleDensity = clamp(
          baseObstacleDensity + li * 0.03,
          0.15,
          0.85
        );

        if (platformType === "trap") {
          // trap platforms always have at least one saw hazard
          const saw = addSaw(platform, hazards);

          // high probability of a score number near trap saws
          if (scoreItemCount < maxScoreItems && saw && Math.random() < 0.8) {
            const value = Math.random() < 0.4 ? 20 : 10;
            addScoreItemNearHazard(bonuses, saw, unit, value);
            scoreItemCount++;
          }

          // rare grapple charge booster near trap saws
          if (saw && Math.random() < 0.08) {
            addGrappleBoosterNearHazard(boosters, saw, unit);
          }
        } else if (Math.random() < obstacleDensity) {
          const choice = Math.random();

          if (style === "factory") {
            // factory prefers spikes and lasers
            if (choice < 0.5) {
              const spikes = addSpikes(platform, hazards);
              // score item near spikes with good chance
              if (
                scoreItemCount < maxScoreItems &&
                spikes &&
                Math.random() < 0.6
              ) {
                const value = Math.random() < 0.5 ? 10 : 5;
                addScoreItemNearHazard(bonuses, spikes, unit, value);
                scoreItemCount++;
              }

              // rare grapple booster near spikes
              if (spikes && Math.random() < 0.06) {
                addGrappleBoosterNearHazard(boosters, spikes, unit);
              }
            } else if (choice < 0.85) {
              const laser = addLaser(platform, hazards, layerY);
              if (
                scoreItemCount < maxScoreItems &&
                laser &&
                Math.random() < 0.5
              ) {
                const value = Math.random() < 0.5 ? 10 : 5;
                addScoreItemNearHazard(bonuses, laser, unit, value);
                scoreItemCount++;
              }

              // rare grapple booster near lasers
              if (laser && Math.random() < 0.06) {
                addGrappleBoosterNearHazard(boosters, laser, unit);
              }
            } else {
              // occasional mid-air score item above platform, rarer on safe ground
              if (
                scoreItemCount < maxScoreItems &&
                Math.random() < (isGroundLayer ? 0.05 : 0.15)
              ) {
                const value = 5;
                const targetY =
                  platform.y - randRange(unit * 0.5, unit * 2);
                addScoreItemOnPlatform(bonuses, platform, unit, value, targetY);
                scoreItemCount++;
              }
            }
          } else if (style === "station") {
            // station prefers safer layouts with more bonuses
            if (choice < 0.3) {
              const spikes = addSpikes(platform, hazards);
              if (
                scoreItemCount < maxScoreItems &&
                spikes &&
                Math.random() < 0.4
              ) {
                const value = Math.random() < 0.6 ? 10 : 5;
                addScoreItemNearHazard(bonuses, spikes, unit, value);
                scoreItemCount++;
              }

              if (spikes && Math.random() < 0.05) {
                addGrappleBoosterNearHazard(boosters, spikes, unit);
              }
            } else if (choice < 0.6) {
              const laser = addLaser(platform, hazards, layerY);
              if (
                scoreItemCount < maxScoreItems &&
                laser &&
                Math.random() < 0.35
              ) {
                const value = Math.random() < 0.5 ? 10 : 5;
                addScoreItemNearHazard(bonuses, laser, unit, value);
                scoreItemCount++;
              }

              if (laser && Math.random() < 0.05) {
                addGrappleBoosterNearHazard(boosters, laser, unit);
              }
            } else {
              if (
                scoreItemCount < maxScoreItems &&
                Math.random() < (isGroundLayer ? 0.08 : 0.18)
              ) {
                const value = 5;
                const targetY =
                  platform.y - randRange(unit * 0.5, unit * 2.5);
                addScoreItemOnPlatform(bonuses, platform, unit, value, targetY);
                scoreItemCount++;
              }
            }
          } else {
            // digital world: more lasers and airborne bonuses
            if (choice < 0.35) {
              const spikes = addSpikes(platform, hazards);
              if (
                scoreItemCount < maxScoreItems &&
                spikes &&
                Math.random() < 0.55
              ) {
                const value = Math.random() < 0.4 ? 20 : 10;
                addScoreItemNearHazard(bonuses, spikes, unit, value);
                scoreItemCount++;
              }

              if (spikes && Math.random() < 0.07) {
                addGrappleBoosterNearHazard(boosters, spikes, unit);
              }
            } else if (choice < 0.8) {
              const laser = addLaser(
                platform,
                hazards,
                layerY - randRange(unit * 0.5, unit * 2)
              );
              if (
                scoreItemCount < maxScoreItems &&
                laser &&
                Math.random() < 0.6
              ) {
                const value = Math.random() < 0.5 ? 10 : 5;
                addScoreItemNearHazard(bonuses, laser, unit, value);
                scoreItemCount++;
              }

              if (laser && Math.random() < 0.07) {
                addGrappleBoosterNearHazard(boosters, laser, unit);
              }
            } else {
              if (
                scoreItemCount < maxScoreItems &&
                Math.random() < (isGroundLayer ? 0.06 : 0.2)
              ) {
                const value = Math.random() < 0.4 ? 20 : 10;
                const targetY =
                  layerY - randRange(unit * 1, unit * 3);
                addScoreItemOnPlatform(bonuses, platform, unit, value, targetY);
                scoreItemCount++;
              }
            }
          }
        }

        // Boosters: only on normal (non-thin, non-trap) platforms, moderate frequency
        if (platform.type === "static") {
          const r = Math.random();
          if (r < 0.06) {
            addJumpBooster(platform, boosters, unit);
          } else if (r < 0.12) {
            addSpeedBooster(platform, boosters, unit);
          } else if (
            // rare score items on safe platforms with no hazards
            scoreItemCount < maxScoreItems &&
            r < 0.15 &&
            Math.random() < 0.25
          ) {
            const value = 5;
            const targetY =
              platform.y - randRange(unit * 0.5, unit * 1.5);
            addScoreItemOnPlatform(bonuses, platform, unit, value, targetY);
            scoreItemCount++;
          }
        }
      }

      x += segWidth;
      if (makeGap) {
        const gapWidthUnits = Math.floor(
          randRange(6, 12 + difficulty * 2)
        );
        const gapWidth = gapWidthUnits * unit;
        const gapStartX = x;
        x += gapWidth;

        // occasional mid-air score items between platforms
        if (
          scoreItemCount < maxScoreItems &&
          Math.random() < 0.25 &&
          gapWidth > unit * 4
        ) {
          const midX = gapStartX + gapWidth / 2;
          const midY =
            layerY -
            randRange(jumpHeight * 0.3, jumpHeight * 0.8);
          const value = Math.random() < 0.3 ? 20 : 10;
          addFloatingScoreItem(bonuses, midX, midY, unit, value);
          scoreItemCount++;
        }

        // rare risky mid-air grapple booster in large gaps
        if (Math.random() < 0.06 && gapWidth > unit * 6) {
          const midX = gapStartX + gapWidth / 2;
          const midY =
            layerY -
            randRange(jumpHeight * 0.4, jumpHeight * 0.9);
          addFloatingGrappleBooster(boosters, midX, midY, unit);
        }
      }
    }
  }

  // Elevated moving platform, style-dependent (can exist on higher layers)
  const movingBaseChance = 0.25 + difficulty * 0.05;
  let movingChance = movingBaseChance;
  switch (style) {
    case "factory":
      movingChance += 0.1;
      break;
    case "digital":
      movingChance += 0.05;
      break;
  }

  if (Math.random() < clamp(movingChance, 0.2, 0.8)) {
    const widthUnits = Math.floor(randRange(8, 14));
    const width = widthUnits * unit;
    const px = sectionStartX + randRange(
      unit * 4,
      Math.max(unit * 8, sectionLengthPx - width - unit * 4)
    );

    // choose a mid/high layer for the moving platform
    const layerIndexForMoving = Math.floor(
      randRange(
        Math.max(1, Math.floor(layerCount / 3)),
        layerCount
      )
    );
    const py = layers[
      Math.min(layerCount - 1, Math.max(0, layerIndexForMoving))
    ] - randRange(unit * 0.5, unit * 1.5);

    const range = unit * randRange(6, 14);
    const speed = 30 + difficulty * 20 + (style === "digital" ? 10 : 0);

    platforms.push({
      x: px,
      y: py,
      width,
      height: 32,
      type: "moving",
      dir: Math.random() < 0.5 ? -1 : 1,
      range,
      originX: px,
      speed,
      hookable: true
    });
  }

  // After all platforms are created, add smart HookNodes where jumps are impossible
  if (hookRadius && jumpHeight) {
    addSmartHookNodes(platforms, hookRadius, jumpHeight, unit);
  }

  return {
    style,
    sectionStartX,
    sectionEndX,
    platforms,
    hazards,
    bonuses,
    boosters
  };
}
// Player sprite rendering

import { UNIT } from "../constants.js";
import {
  drawSpriteFrame,
  getFrameIndex
} from "../spriteSheetLoader.js";
import {
  spriteConfig,
  getSheet
} from "./sprites.js";

export function drawPlayer(ctx, state, spritesReady) {
  const { player } = state.world;

  // If assets not yet loaded, don't draw placeholder geometry anymore
  if (!spritesReady) return;

  const idleSheet = getSheet("idle");
  if (!idleSheet) return;

  ctx.save();
  ctx.translate(player.x, player.y);

  // Apply a visual pivot offset so the sprite feet sit on the platform
  const visualPivotOffsetY = 0.75 * UNIT; // ~-0.75 units relative to collider pivot
  const visualSpriteAdjustY = -0.325 * UNIT; // raise sprite visually by +0.075 units compared to previous
  ctx.translate(0, visualPivotOffsetY + visualSpriteAdjustY);

  // slight fade during teleport visual effect, without disturbing animation state
  if (player.teleportFadeTimer && player.teleportFadeTimer > 0) {
    const t = player.teleportFadeTimer / (player.teleportFadeDuration || 0.25);
    // quick fade-out then in over the short teleport effect
    const phase = 1 - Math.max(0, Math.min(1, t));
    const alpha = 0.4 + 0.6 * Math.abs(Math.cos(phase * Math.PI * 4));
    ctx.globalAlpha = alpha;
  }

  // flip based on facing, but keep hook animation unflipped
  const isHooking = player.animState === "hook";
  const facing = isHooking ? 1 : player.facing >= 0 ? 1 : -1;
  ctx.scale(facing, 1);

  const baseHeight = player.height;
  const baseWidth = baseHeight; // monster is roughly square

  // Choose animation based on current player animState
  const stateKey = (() => {
    switch (player.animState) {
      case "run":
        return "run";
      case "jump":
        return "jump";
      case "hook":
        return "hook";
      case "dash":
        return "dash";
      case "hurt":
        return "hurt";
      case "death":
        return "death";
      case "idle":
      default:
        return "idle";
    }
  })();

  const config = spriteConfig[stateKey] || spriteConfig.idle;
  const sheet = getSheet(stateKey) || idleSheet;

  // Optional small idle bob so it feels alive
  const t = player.animTime || 0;
  let offsetY = 0;
  if (stateKey === "idle") {
    offsetY = Math.sin(t * 2) * 2;
  }

  ctx.translate(0, offsetY);

  // compute scale so sprite is ~player.height tall
  const scale = baseHeight / sheet.frameHeight;

  // bottom-center pivot: shift sprite up by its height
  ctx.translate(0, -baseHeight / 2);

  // Animation frame index: looping vs one-shot
  let frameIndex = 0;
  if (stateKey === "hook") {
    // For both hang (LMB) and cling (RMB), use a static mid-air idle frame from the jump sheet
    const jumpSheet = getSheet("jump") || sheet;
    const midAirFrame = 3; // a mid-air frame index
    frameIndex = Math.min(midAirFrame, (jumpSheet.frameCount || 1) - 1);
  } else if (config.loop) {
    frameIndex = getFrameIndex(t, config.fps, sheet.frameCount);
  } else {
    const totalFrames = sheet.frameCount;
    const rawIndex = Math.floor(t * config.fps);
    frameIndex = Math.min(totalFrames - 1, rawIndex);
  }

  drawSpriteFrame(
    ctx,
    sheet,
    frameIndex,
    0,
    0,
    scale,
    true,
    1
  );

  // energy bar above head
  const barWidth = baseWidth * 0.5;
  const barHeight = 4;
  const barY = -barHeight - 6;
  const energy = Math.max(0, Math.min(1, player.energy));

  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.fillStyle = "rgba(0,0,0,0.1)";
  ctx.beginPath();
  ctx.rect(-barWidth / 2, barY, barWidth, barHeight);
  ctx.fill();
  ctx.stroke();

  let energyColor = "#4caf50";
  if (energy < 0.3) {
    energyColor = "#f44336";
  } else if (energy < 0.6) {
    energyColor = "#ff9800";
  }
  ctx.fillStyle = energyColor;
  ctx.fillRect(
    -barWidth / 2 + 1,
    barY + 1,
    (barWidth - 2) * energy,
    barHeight - 2
  );

  // grapple charge icons next to stamina bar
  const maxCharges = player.grappleChargesMax || 0;
  const charges = Math.max(0, Math.min(maxCharges, player.grappleCharges || 0));
  if (maxCharges > 0) {
    const iconSize = 3;
    const spacing = 2;
    const totalWidth = maxCharges * iconSize + (maxCharges - 1) * spacing;
    const startX = barWidth / 2 + 4; // to the right of the energy bar
    const baseY = barY + barHeight / 2;

    for (let i = 0; i < maxCharges; i++) {
      const filled = i < charges;
      const x = startX + i * (iconSize + spacing);

      ctx.save();
      ctx.translate(x, baseY);

      ctx.beginPath();
      ctx.rect(-iconSize / 2, -iconSize / 2, iconSize, iconSize);
      ctx.fillStyle = filled ? "rgba(200,235,255,0.95)" : "rgba(40,50,60,0.5)";
      ctx.strokeStyle = "rgba(10,15,20,0.9)";
      ctx.lineWidth = 0.75;
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }
  }

  ctx.restore();
}
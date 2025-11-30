// Hook line, dash waves and dust FX rendering

import {
  drawSpriteFrame,
  getFrameIndex
} from "../spriteSheetLoader.js";
import {
  spriteConfig,
  getSheet
} from "./sprites.js";

export function drawFX(ctx, state, spritesReady) {
  drawHook(ctx, state);
  drawDashWaves(ctx, state);
  drawDustFX(ctx, state, spritesReady);
  drawTeleportFX(ctx, state);
  drawFloatingNumbers(ctx, state);
  drawGrappleTexts(ctx, state);
}

function drawHook(ctx, state) {
  const { player } = state.world;
  if (!player.hookActive) return;

  ctx.save();
  ctx.strokeStyle = "rgba(60,50,40,0.9)";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(player.x, player.y - player.height * 0.25);
  ctx.lineTo(player.hookX, player.hookY);
  ctx.stroke();

  // small hook point
  ctx.fillStyle = "#c2b59b";
  ctx.beginPath();
  ctx.arc(player.hookX, player.hookY, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawDashWaves(ctx, state) {
  const { fx } = state.world;
  if (!fx || !fx.dashWaves) return;

  ctx.save();
  for (const wave of fx.dashWaves) {
    const progress = wave.t / wave.duration;
    const alpha = 1 - progress;
    const radius = 10 + 40 * progress;

    ctx.strokeStyle = `rgba(220,240,255,${0.6 * alpha})`;
    ctx.lineWidth = 3 * (1 - progress);
    ctx.beginPath();
    ctx.arc(wave.x, wave.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawDustFX(ctx, state, spritesReady) {
  const { fx } = state.world;
  if (!fx) return;

  const runSheet = spritesReady ? getSheet("runDust") : null;
  const jumpSheet = spritesReady ? getSheet("jumpDust") : null;

  ctx.save();

  // running dust
  if (fx.runDust && runSheet) {
    for (const puff of fx.runDust) {
      const progress = puff.t / puff.duration;
      const frame = Math.min(
        runSheet.frameCount - 1,
        getFrameIndex(
          progress * puff.duration,
          spriteConfig.runDust.fps,
          runSheet.frameCount
        )
      );
      const scale = 0.75 + 0.25 * progress;
      drawSpriteFrame(
        ctx,
        runSheet,
        frame,
        puff.x,
        puff.y,
        scale,
        true,
        1
      );
    }
  }

  // jump dust
  if (fx.jumpDust && jumpSheet) {
    for (const puff of fx.jumpDust) {
      const progress = puff.t / puff.duration;
      const frame = Math.min(
        jumpSheet.frameCount - 1,
        getFrameIndex(
          progress * puff.duration,
          spriteConfig.jumpDust.fps,
          jumpSheet.frameCount
        )
      );
      const scale = 0.8 + 0.3 * progress;
      drawSpriteFrame(
        ctx,
        jumpSheet,
        frame,
        puff.x,
        puff.y,
        scale,
        true,
        1
      );
    }
  }

  ctx.restore();
}

function drawTeleportFX(ctx, state) {
  const { fx } = state.world;
  if (!fx || !fx.teleportBursts) return;

  ctx.save();

  for (const burst of fx.teleportBursts) {
    const progress = burst.t / burst.duration;
    const alpha = 1 - progress;

    const baseRadius = 10;
    const radius = baseRadius + 40 * progress;

    // outer ring
    ctx.strokeStyle = `rgba(120, 80, 200, ${0.5 * alpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(burst.x, burst.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    // inner glow
    const innerRadius = radius * 0.4;
    const grad = ctx.createRadialGradient(
      burst.x,
      burst.y,
      0,
      burst.x,
      burst.y,
      innerRadius
    );
    grad.addColorStop(0, `rgba(255, 240, 255, ${0.8 * alpha})`);
    grad.addColorStop(0.5, `rgba(200, 150, 255, ${0.4 * alpha})`);
    grad.addColorStop(1, "rgba(200, 150, 255, 0)");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(burst.x, burst.y, innerRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawFloatingNumbers(ctx, state) {
  const { fx } = state.world;
  if (!fx || !fx.floatingNumbers) return;

  ctx.save();
  ctx.font = "12px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (const num of fx.floatingNumbers) {
    const progress = num.t / num.duration;
    const alpha = 1 - progress;
    const rise = 20 * progress;

    const value =
      typeof num.value === "number" ? num.value : 0;

    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
    ctx.lineWidth = 2;

    const x = num.x;
    const y = num.y - rise;

    // outline
    ctx.strokeText(String(value), x, y);
    // fill
    ctx.fillText(String(value), x, y);
  }

  ctx.restore();
}

function drawGrappleTexts(ctx, state) {
  const { fx } = state.world;
  if (!fx || !fx.grappleTexts) return;

  ctx.save();
  ctx.font = "11px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (const e of fx.grappleTexts) {
    const progress = e.t / e.duration;
    const alpha = 1 - progress;
    const rise = 18 * progress;

    const text = e.text || "+1";

    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(200, 235, 255, 0.95)";
    ctx.strokeStyle = "rgba(15, 35, 60, 0.8)";
    ctx.lineWidth = 2;

    const x = e.x;
    const y = e.y - rise;

    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
  }

  ctx.restore();
}
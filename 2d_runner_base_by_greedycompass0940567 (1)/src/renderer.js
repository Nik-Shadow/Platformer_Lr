import { CAMERA_SCALE } from "./constants.js";
import {
  areSpritesLoaded
} from "./render/sprites.js";
import { drawBackground } from "./render/background.js";
import { drawPlatforms, drawHookNodes } from "./render/platforms.js";
import { drawHazardsAndBonuses, drawFireWall } from "./render/hazards.js";
import { drawFX } from "./render/fx.js";
import { drawPlayer } from "./render/player.js";
import { drawHUD, drawGameStateOverlay } from "./render/hud.js";

export function createRenderer(ctx, state) {
  function clear() {
    const { width, height } = state;
    const { player } = state.world;

    // palette tweaks based only on hook effects (no dash influence)
    const hookActive = player.hookActive;

    let topColor = "#f7f3ea";
    let bottomColor = "#e0d5c5";

    if (hookActive) {
      // slightly cooler, muted while on hook
      topColor = "#f1f0ee";
      bottomColor = "#d6cec2";
    }

    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, topColor);
    grad.addColorStop(1, bottomColor);

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  function onResize() {
    // no cached sizes yet, but keep hook for future
  }

  function render() {
    // Ensure pixelated rendering (point filter) for all sprites
    ctx.imageSmoothingEnabled = false;

    clear();
    drawBackground(ctx, state);

    ctx.save();
    ctx.scale(CAMERA_SCALE, CAMERA_SCALE);
    ctx.translate(-state.world.cameraX, -state.world.cameraY);

    drawFireWall(ctx, state);
    drawPlatforms(ctx, state);
    drawHazardsAndBonuses(ctx, state);
    drawHookNodes(ctx, state);
    drawFX(ctx, state, areSpritesLoaded());
    drawPlayer(ctx, state, areSpritesLoaded());

    ctx.restore();

    drawHUD(ctx, state);
    drawGameStateOverlay(ctx, state);
  }

  return {
    onResize,
    render
  };
}


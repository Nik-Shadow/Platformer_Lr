import { CAMERA_SCALE } from "./constants.js";
import { createWorld } from "./world.js";
import { createRenderer } from "./renderer.js";

export function createGame(canvas) {
  const ctx = canvas.getContext("2d");

  const input = {
    jump: false,
    hook: false,
    hookX: 0,
    hookY: 0,
    dash: false,
    toggleDimension: false,
    moveDir: 0, // -1 = left, 1 = right, 0 = idle
    hookHang: false, // LMB hold (normal hang)
    hookPull: false,  // E held (used with LMB for pull/cling)
    dropDown: false   // S / ArrowDown for dropping through thin platforms
  };

  const state = {
    width: canvas.width,
    height: canvas.height,
    world: createWorld(),
    renderer: null,
    input,
    gameState: "menu" // "menu" | "running" | "paused" | "gameover"
  };

  state.renderer = createRenderer(ctx, state);

  function onResize(w, h) {
    state.width = w;
    state.height = h;
    state.renderer.onResize();
  }

  // input handling
  function handleKeyDown(e) {
    if (state.gameState === "menu") {
      // any jump key starts the game
      if (e.code === "Space" || e.code === "Enter") {
        start();
      }
    }

    if (state.gameState !== "running") return;

    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
      input.jump = true;
    }
    // horizontal move: A/D or arrows
    if (e.code === "KeyA" || e.code === "ArrowLeft") {
      input.moveDir = -1;
    }
    if (e.code === "KeyD" || e.code === "ArrowRight") {
      input.moveDir = 1;
    }
    // S / ArrowDown: drop through thin platforms
    if (e.code === "KeyS" || e.code === "ArrowDown") {
      input.dropDown = true;
    }
    // dash on Shift
    if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
      input.dash = true;
    }
    // Q: toggle dimension only
    if (e.code === "KeyQ") {
      input.toggleDimension = true;
    }
    // E: enable pull modifier (used with LMB for pull/cling)
    if (e.code === "KeyE") {
      input.hookPull = true;
    }
  }

  function handleKeyUp(e) {
    if (state.gameState !== "running") return;

    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
      input.jump = false;
    }
    // stop move when releasing corresponding key
    if (e.code === "KeyA" || e.code === "ArrowLeft") {
      if (input.moveDir < 0) input.moveDir = 0;
    }
    if (e.code === "KeyD" || e.code === "ArrowRight") {
      if (input.moveDir > 0) input.moveDir = 0;
    }
    if (e.code === "KeyS" || e.code === "ArrowDown") {
      input.dropDown = false;
    }
    if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
      input.dash = false;
    }
    if (e.code === "KeyQ") {
      input.toggleDimension = false;
    }
    if (e.code === "KeyE") {
      input.hookPull = false;
    }
  }

  function handlePointerDown(e) {
    if (state.gameState === "menu") {
      start();
      return;
    }
    if (state.gameState !== "running") return;

    // map pointer to canvas coordinates
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // convert to world coordinates (raycast uses global/world space)
    const worldX = x / CAMERA_SCALE + state.world.cameraX;
    const worldY = y / CAMERA_SCALE + state.world.cameraY;

    // left mouse button = hang mode by default
    if (e.button === 0) {
      input.hookHang = true;
      // pull/cling mode is enabled inside hook logic when E (hookPull) is also held
      input.hook = true;
      input.hookX = worldX;
      input.hookY = worldY;
    }
  }

  function handlePointerUp(e) {
    if (state.gameState !== "running") return;
    // release all hook modes on pointer up
    input.hook = false;
    input.hookHang = false;
    // NOTE: input.hookPull is controlled by the E key, not by mouse buttons
  }

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  canvas.addEventListener("pointerdown", handlePointerDown);
  window.addEventListener("pointerup", handlePointerUp);
  window.addEventListener("pointercancel", handlePointerUp);
  window.addEventListener("blur", handlePointerUp);

  // prevent default context menu (no RMB gameplay use anymore)
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  function update(dt) {
    if (state.gameState === "running") {
      state.world.update(dt, input);
      // hook input is held, so do not clear hookHang / hookPull here
      input.hook = false;

      // if player died in the world, switch to game over state
      if (!state.world.player.alive) {
        state.gameState = "gameover";
      }
      return;
    }

    if (state.gameState === "gameover") {
      // during game over, keep death animation playing but ignore controls
      state.world.updateGameOver(dt);
      input.hook = false;
      input.dash = false;
      input.toggleDimension = false;
      input.moveDir = 0;
      input.hookHang = false;
      input.hookPull = false;
      input.dropDown = false;
      return;
    }

    // menu or paused: clear one-shot inputs, no world update
    input.hook = false;
    input.dash = false;
    input.toggleDimension = false;
    input.moveDir = 0;
    input.hookHang = false;
    input.hookPull = false;
    input.dropDown = false;
  }

  function render() {
    state.renderer.render();
  }

  function start() {
    if (state.gameState === "running") return;
    state.gameState = "running";
  }

  function togglePause() {
    if (state.gameState === "menu" || state.gameState === "gameover") return;
    state.gameState = state.gameState === "running" ? "paused" : "running";
  }

  function restart() {
    state.world = createWorld();
    state.renderer = createRenderer(ctx, state);
    state.gameState = "running";
  }

  return {
    onResize,
    update,
    render,
    start,
    togglePause,
    restart
  };
}


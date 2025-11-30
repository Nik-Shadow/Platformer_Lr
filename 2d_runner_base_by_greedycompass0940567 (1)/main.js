import { createGame } from "./src/game.js";

const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById("game"));
const root = document.getElementById("game-root");

let game;

function resize() {
  const rootRect = root.getBoundingClientRect();
  const maxWidth = rootRect.width;
  const maxHeight = rootRect.height;

  // Fixed virtual resolution with letterboxing
  const targetWidth = 480;
  const targetHeight = 270;
  const targetAspect = targetWidth / targetHeight;
  const actualAspect = maxWidth / maxHeight;

  let width, height;
  if (actualAspect > targetAspect) {
    // too wide, limit by height
    height = maxHeight;
    width = height * targetAspect;
  } else {
    // too tall, limit by width
    width = maxWidth;
    height = width / targetAspect;
  }

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  // internal resolution
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  if (game) game.onResize(targetWidth, targetHeight);
}

function init() {
  resize();
  game = createGame(canvas);

  // Wire UI buttons
  const btnStart = document.getElementById("btn-start");
  const btnPause = document.getElementById("btn-pause");
  const btnRestart = document.getElementById("btn-restart");

  if (btnStart) {
    btnStart.addEventListener("click", () => {
      game.start();
    });
  }

  if (btnPause) {
    btnPause.addEventListener("click", () => {
      game.togglePause();
    });
  }

  if (btnRestart) {
    btnRestart.addEventListener("click", () => {
      game.restart();
    });
  }

  let lastTime = performance.now();
  let accumulator = 0;
  const STEP = 1 / 60;

  function loop(now) {
    const dt = Math.min((now - lastTime) / 1000, 1 / 30); // clamp dt
    lastTime = now;
    accumulator += dt;

    // fixed-timestep updates for more stable physics
    while (accumulator >= STEP) {
      game.update(STEP);
      accumulator -= STEP;
    }

    game.render();
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

window.addEventListener("resize", resize, { passive: true });
init();
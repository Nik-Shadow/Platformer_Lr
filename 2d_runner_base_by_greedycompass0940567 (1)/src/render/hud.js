// HUD and overlay rendering

export function drawHUD(ctx, state) {
  const { width } = state;
  const { score, difficulty } = state.world;

  ctx.save();
  ctx.font = "12px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillStyle = "rgba(40,30,20,0.9)";
  ctx.textBaseline = "top";

  const scoreText = `Счёт: ${score}`;
  const diffText = `Уровень: ${difficulty}`;
  ctx.fillText(scoreText, 8, 6);
  ctx.fillText(diffText, 8, 20);

  ctx.restore();
}

export function drawGameStateOverlay(ctx, state) {
  const { width, height, gameState } = state;
  if (gameState === "running") return;

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#f7f3ea";
  ctx.font = "16px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  let text = "";
  if (gameState === "menu") {
    text = "Нажмите Старт или экран";
  } else if (gameState === "paused") {
    text = "Пауза";
  } else if (gameState === "gameover") {
    text = "Game Over";
  }

  if (text) {
    ctx.fillText(text, width / 2, height / 2);
  }

  ctx.restore();
}
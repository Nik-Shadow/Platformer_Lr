// Platform and hook node rendering

export function drawPlatforms(ctx, state) {
  const { platforms } = state.world;
  if (!platforms) return;

  for (const platform of platforms) {
    // skip visual drawing for hook-only nodes; they are rendered separately
    if (platform.type === "hookNode" || platform.type === "hookPoint") continue;

    ctx.save();
    ctx.translate(platform.x, platform.y);

    if (platform.type === "thin") {
      // thin one-way platform: only a slim top plank
      const topHeight = 6;
      ctx.fillStyle = "#726552";
      ctx.fillRect(0, -topHeight, platform.width, topHeight);

      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(0, -topHeight, platform.width, 1);
    } else {
      // top surface
      const topHeight = 10;
      ctx.fillStyle = platform.type === "moving" ? "#6b5b45" : "#5b513f";
      ctx.fillRect(0, -topHeight, platform.width, topHeight);

      // body
      ctx.fillStyle = platform.type === "moving" ? "#4b4132" : "#3b3427";
      ctx.fillRect(0, 0, platform.width, platform.height);

      // small front edge highlight
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(0, -topHeight, platform.width, 2);
    }

    ctx.restore();
  }
}

export function drawHookNodes(ctx, state) {
  const { platforms } = state.world;
  if (!platforms) return;

  const t = performance.now() / 1000;
  for (const p of platforms) {
    if (p.type !== "hookNode") continue;

    const centerX = p.x + p.width / 2;
    const baseY = p.y;
    const floatOffset = Math.sin(t * 3 + centerX * 0.01) * 4;

    ctx.save();
    ctx.translate(centerX, baseY + floatOffset);

    // glow
    const radius = 6;
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 3);
    grad.addColorStop(0, "rgba(255, 255, 200, 0.9)");
    grad.addColorStop(0.4, "rgba(255, 220, 150, 0.7)");
    grad.addColorStop(1, "rgba(255, 190, 120, 0)");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 3, 0, Math.PI * 2);
    ctx.fill();

    // core
    ctx.fillStyle = "#ffe37a";
    ctx.strokeStyle = "rgba(120, 60, 0, 0.6)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}
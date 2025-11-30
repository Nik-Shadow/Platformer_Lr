// Hazard, bonus, and fire wall rendering

export function drawHazardsAndBonuses(ctx, state) {
  const { hazards, bonuses, boosters } = state.world;

  if (hazards) {
    for (const h of hazards) {
      if (h.type === "spikes") {
        ctx.save();
        ctx.fillStyle = "#8b3b2f";
        const spikeCount = Math.max(3, Math.floor(h.width / 12));
        const baseY = h.y;
        const spikeWidth = h.width / spikeCount;
        for (let i = 0; i < spikeCount; i++) {
          const x = h.x + i * spikeWidth;
          ctx.beginPath();
          ctx.moveTo(x, baseY);
          ctx.lineTo(x + spikeWidth * 0.5, baseY - 12);
          ctx.lineTo(x + spikeWidth, baseY);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      } else if (h.type === "laser") {
        const active = Math.sin(h.phase) > 0.2;
        ctx.save();
        ctx.fillStyle = active ? "rgba(255,60,60,0.85)" : "rgba(255,60,60,0.25)";
        ctx.fillRect(h.x, h.y, h.width, h.height);
        ctx.restore();
      } else if (h.type === "saw") {
        ctx.save();
        const t = performance.now() / 1000;
        const angle = (h.spin || 0) + t * 6;

        ctx.translate(h.cx, h.cy);
        ctx.rotate(angle);

        // outer blade
        ctx.fillStyle = "#d9d9d9";
        ctx.beginPath();
        ctx.arc(0, 0, h.radius, 0, Math.PI * 2);
        ctx.fill();

        // teeth
        ctx.fillStyle = "#b0b0b0";
        const teeth = 10;
        for (let i = 0; i < teeth; i++) {
          const a0 = (i / teeth) * Math.PI * 2;
          const a1 = ((i + 0.5) / teeth) * Math.PI * 2;
          const rInner = h.radius * 0.7;
          const rOuter = h.radius * 1.05;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a0) * rInner, Math.sin(a0) * rInner);
          ctx.lineTo(Math.cos(a1) * rOuter, Math.sin(a1) * rOuter);
          const a2 = ((i + 1) / teeth) * Math.PI * 2;
          ctx.lineTo(Math.cos(a2) * rInner, Math.sin(a2) * rInner);
          ctx.closePath();
          ctx.fill();
        }

        // hub
        ctx.fillStyle = "#666";
        ctx.beginPath();
        ctx.arc(0, 0, h.radius * 0.35, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }
  }

  if (bonuses) {
    const t = performance.now() / 1000;
    for (const b of bonuses) {
      if (b.collected) continue;
      ctx.save();
      const cx = b.x + b.width / 2;
      const cy = b.y + b.height / 2;

      // gentle up-down bob
      const bob = Math.sin(t * 3 + cx * 0.05) * 3;

      ctx.translate(cx, cy + bob);

      const r = Math.min(b.width, b.height) / 2;

      // glowing disk background
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.8);
      grad.addColorStop(0, "rgba(255, 255, 230, 0.9)");
      grad.addColorStop(0.5, "rgba(255, 220, 160, 0.6)");
      grad.addColorStop(1, "rgba(255, 200, 140, 0)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.8, 0, Math.PI * 2);
      ctx.fill();

      // core token
      ctx.fillStyle = "#ffc94a";
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // numeric value above
      const value =
        typeof b.scoreValue === "number" ? b.scoreValue : 10;
      ctx.font = "10px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillStyle = "#2b1b14";
      ctx.fillText(String(value), 0, -r - 2);

      ctx.restore();
    }
  }

  // boosters: jump and speed
  if (boosters) {
    for (const bo of boosters) {
      ctx.save();
      ctx.translate(bo.x + bo.width / 2, bo.y + bo.height / 2);

      if (bo.type === "jump") {
        // spring / trampoline look
        const r = Math.min(bo.width, bo.height) / 2;
        ctx.fillStyle = "#57c26b";
        ctx.strokeStyle = "rgba(20,60,20,0.8)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-bo.width / 2, -bo.height / 2, bo.width, bo.height, 3);
        ctx.fill();
        ctx.stroke();
        // top highlight
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.fillRect(-bo.width / 2 + 2, -bo.height / 2 + 1, bo.width - 4, 2);
      } else if (bo.type === "speed") {
        // speed lane
        const t = performance.now() / 1000;
        const glow = 0.4 + 0.3 * Math.sin(t * 6);
        ctx.fillStyle = `rgba(80,160,255,${0.7 + glow * 0.3})`;
        ctx.beginPath();
        ctx.roundRect(-bo.width / 2, -bo.height / 2, bo.width, bo.height, 2);
        ctx.fill();

        // center line
        ctx.strokeStyle = "rgba(240,250,255,0.9)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-bo.width / 2 + 3, 0);
        ctx.lineTo(bo.width / 2 - 3, 0);
        ctx.stroke();
      } else if (bo.type === "grapple") {
        // grapple charge booster: small glowing crystal
        const t = performance.now() / 1000;
        const pulse = 0.6 + 0.3 * Math.sin(t * 5.5);
        const r = Math.min(bo.width, bo.height) * 0.45;

        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2);
        grad.addColorStop(0, `rgba(210, 240, 255, ${0.9 * pulse})`);
        grad.addColorStop(0.5, `rgba(150, 210, 255, ${0.7 * pulse})`);
        grad.addColorStop(1, "rgba(120, 180, 255, 0)");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, r * 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#7fd1ff";
        ctx.strokeStyle = "rgba(20,40,80,0.9)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.8, 0);
        ctx.lineTo(0, r);
        ctx.lineTo(-r * 0.8, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    }
  }
}

export function drawFireWall(ctx, state) {
  const { fireWall } = state.world;
  if (!fireWall) return;

  ctx.save();
  ctx.translate(fireWall.x, fireWall.y);

  const width = fireWall.width;
  const height = fireWall.height;

  const t = performance.now() / 1000;

  // subtle vertical wave motion
  const waveOffsetY = Math.sin(t * 1.3) * 30;
  ctx.translate(0, waveOffsetY);

  // outer glow
  ctx.save();
  ctx.filter = "blur(18px)";
  ctx.globalAlpha = 0.6 + 0.2 * Math.sin(t * 3.2);
  const glowGrad = ctx.createLinearGradient(0, 0, width, 0);
  glowGrad.addColorStop(0, "rgba(255, 80, 40, 0.9)");
  glowGrad.addColorStop(0.5, "rgba(255, 160, 60, 0.9)");
  glowGrad.addColorStop(1, "rgba(255, 230, 140, 0.9)");
  ctx.fillStyle = glowGrad;
  ctx.fillRect(-10, -20, width + 20, height + 40);
  ctx.restore();

  // animated flame body with flicker
  const flicker = 0.75 + 0.25 * Math.sin(t * 9.7);
  const bodyGrad = ctx.createLinearGradient(0, 0, width, 0);
  bodyGrad.addColorStop(0, `rgba(255, 90, 40, ${0.9 * flicker})`);
  bodyGrad.addColorStop(0.3, `rgba(255, 150, 60, ${0.95 * flicker})`);
  bodyGrad.addColorStop(0.7, `rgba(255, 210, 100, ${0.85 * flicker})`);
  bodyGrad.addColorStop(1, `rgba(255, 250, 190, ${0.8 * flicker})`);

  ctx.fillStyle = bodyGrad;
  ctx.fillRect(0, 0, width, height);

  // inner flame texture using sine waves
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  const bands = 7;
  for (let i = 0; i < bands; i++) {
    const phase = t * (2 + i * 0.7);
    const bandY = (height / bands) * i;
    const amplitude = 8 + i * 3;
    const freq = 0.04 + i * 0.01;

    ctx.beginPath();
    ctx.moveTo(0, bandY);
    for (let x = 0; x <= width; x += 6) {
      const y =
        bandY +
        Math.sin(phase + x * freq) * amplitude;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, bandY + 40);
    ctx.lineTo(0, bandY + 40);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // vertical flicker lines
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
  ctx.lineWidth = 2;
  const lines = 5;
  for (let i = 0; i < lines; i++) {
    const x =
      (width / (lines + 1)) * (i + 1) +
      Math.sin(t * 5 + i * 1.3) * 3;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(
      x + Math.sin(t * 6.5 + i) * 8,
      height
    );
    ctx.stroke();
  }
  ctx.restore();

  ctx.restore();
}
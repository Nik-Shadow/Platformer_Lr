// Parallax background using crystal cave texture

const IMAGE_URL = "./1eqlldooo_pavel-sivash-frame-00019.jpg";

let parallaxManager = null;

class ParallaxLayer {
  constructor(options) {
    this.image = options.image;
    // Horizontal / vertical parallax multipliers, based on player velocity
    this.parallaxX = options.parallaxX || 0;
    this.parallaxY = options.parallaxY || 0;

    this.tint = options.tint || "rgba(255,255,255,1)";
    this.baseAlpha = options.baseAlpha ?? 1;
    this.blur = options.blur || 0;
    this.extra = options.extra || null; // {type: "farDrift"|"midSway"|"glow"}

    // Base (resting) position in screen space
    this.baseX = 0;
    this.baseY = 0;

    // Current animated position (lerped)
    this.posX = 0;
    this.posY = 0;
  }

  /**
   * Update the layer position based on player velocity and time.
   * backgroundOffsetX/Y are the target offsets relative to the base position.
   */
  update(dt, playerVx, playerVy) {
    // Compute parallax offsets from current player velocity
    const offsetX = playerVx * this.parallaxX;
    const offsetY = playerVy * this.parallaxY;

    // Target position is base position plus instantaneous parallax offsets
    const targetX = this.baseX + offsetX;
    const targetY = this.baseY + offsetY;

    // Smoothly return towards target (prevents permanent drift)
    const lerpFactor = 0.1;
    this.posX += (targetX - this.posX) * lerpFactor;
    this.posY += (targetY - this.posY) * lerpFactor;
  }

  draw(ctx, viewWidth, viewHeight, time) {
    if (!this.image) return;

    const img = this.image;

    // "Cover" scaling: make tile cover viewport in at least one dimension
    const scale = Math.max(viewWidth / img.width, viewHeight / img.height);
    const tileW = img.width * scale;
    const tileH = img.height * scale;

    const baseY = this.posY;

    ctx.save();

    // Apply blur and tint/alpha
    ctx.filter = this.blur > 0 ? `blur(${this.blur}px)` : "none";

    // Optional small idle effects
    let extraOffsetY = 0;
    let extraOffsetX = 0;
    let alpha = this.baseAlpha;

    if (this.extra && this.extra.type === "farDrift") {
      // slow vertical drift (0.5% of viewport height)
      const amp = viewHeight * 0.005;
      extraOffsetY += Math.sin(time * 0.2) * amp;
    } else if (this.extra && this.extra.type === "midSway") {
      // subtle horizontal sway (1% of viewport width)
      const amp = viewWidth * 0.01;
      extraOffsetX += Math.sin(time * 0.4) * amp;
    } else if (this.extra && this.extra.type === "glow") {
      // gentle glowing pulse
      const period = 1.8;
      const phase = (time % period) / period;
      alpha *= 0.75 + 0.25 * Math.sin(phase * Math.PI * 2);
    }

    ctx.globalAlpha = alpha;

    // Multiply-like tint: draw tinted rect then composite the image
    ctx.save();
    ctx.fillStyle = this.tint;
    ctx.globalCompositeOperation = "multiply";
    ctx.fillRect(0, 0, viewWidth, viewHeight);
    ctx.restore();

    ctx.globalCompositeOperation = "lighter";

    // Single draw per layer: stretch one tile to cover the viewport
    const drawX = - (tileW - viewWidth) / 2 + this.posX + extraOffsetX;
    const drawY = - (tileH - viewHeight) / 2 + baseY + extraOffsetY;

    ctx.drawImage(
      img,
      0,
      0,
      img.width,
      img.height,
      drawX,
      drawY,
      tileW,
      tileH
    );

    ctx.restore();
  }
}

class ParallaxManager {
  constructor(image) {
    this.image = image;
    this.layers = [];
    this.lastTime = performance.now() / 1000;
    this.initialized = false;
  }

  initLayers() {
    if (this.initialized || !this.image) return;

    // FAR layer: darkest, soft blur
    this.layers.push(
      new ParallaxLayer({
        image: this.image,
        parallaxX: 0.05,
        parallaxY: 0.01,
        tint: "rgba(120,160,220,1)",
        baseAlpha: 0.65,
        blur: 1.5,
        extra: { type: "farDrift" }
      })
    );

    // MID layer: mid-depth crystals
    this.layers.push(
      new ParallaxLayer({
        image: this.image,
        parallaxX: 0.10,
        parallaxY: 0.02,
        tint: "rgba(160,200,255,1)",
        baseAlpha: 0.85,
        blur: 0.8,
        extra: { type: "midSway" }
      })
    );

    // NEAR layer: brighter, sharper
    this.layers.push(
      new ParallaxLayer({
        image: this.image,
        parallaxX: 0.20,
        parallaxY: 0.04,
        tint: "rgba(200,240,255,1)",
        baseAlpha: 0.95,
        blur: 0.3,
        extra: null
      })
    );

    // FOREGROUND GLOW: subtle glow overlay
    this.layers.push(
      new ParallaxLayer({
        image: this.image,
        parallaxX: 0.30,
        parallaxY: 0.06,
        tint: "rgba(210,255,255,1)",
        baseAlpha: 0.35,
        blur: 2.0,
        extra: { type: "glow" }
      })
    );

    // Initialize base positions at the visual center of the screen
    for (const layer of this.layers) {
      layer.baseX = 0;
      layer.baseY = 0;
      layer.posX = layer.baseX;
      layer.posY = layer.baseY;
    }

    this.initialized = true;
  }

  static async getInstance() {
    if (parallaxManager) return parallaxManager;

    const img = await ParallaxManager.loadImage(IMAGE_URL);
    parallaxManager = new ParallaxManager(img);
    parallaxManager.initLayers();
    return parallaxManager;
  }

  static loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = url;
    });
  }

  draw(ctx, state) {
    if (!this.image) return;

    const now = performance.now() / 1000;
    const dt = Math.max(0, Math.min(now - this.lastTime, 1 / 30));
    this.lastTime = now;

    const { width, height } = state;
    const world = state.world;

    const player = world.player || { vx: 0, vy: 0 };
    const playerVx = player.vx || 0;
    const playerVy = player.vy || 0;

    const time = now;

    // Update each layer's position based on current player velocity
    for (const layer of this.layers) {
      layer.update(dt, playerVx, playerVy);
      layer.draw(ctx, width, height, time);
    }
  }
}

let loadingPromise = null;

/**
 * Draw the multi-layer crystal cave parallax background.
 * This function is stateless from the outside; internal offsets are managed
 * by ParallaxManager, independent from the game camera and world Y.
 */
export function drawBackground(ctx, state) {
  if (!loadingPromise) {
    loadingPromise = ParallaxManager.getInstance().catch(() => null);
  }

  if (!parallaxManager) {
    // not loaded yet: fill with a simple dark gradient placeholder
    const { width, height } = state;
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, "#050608");
    grad.addColorStop(1, "#0b0f1a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  parallaxManager.draw(ctx, state);
}
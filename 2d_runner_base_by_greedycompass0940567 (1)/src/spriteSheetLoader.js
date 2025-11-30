/**
 * Simple utility for working with 2D sprite sheets in a canvas-only project.
 *
 * This does NOT automatically scan folders or unzip archives; it assumes you
 * have already unzipped your PNG files into a web-served folder and that you
 * will call this helper with the correct image URL and frame layout info.
 */

/**
 * @typedef {Object} SpriteSheet
 * @property {HTMLImageElement} image - Loaded image object
 * @property {number} frameWidth - Width of a single frame in pixels
 * @property {number} frameHeight - Height of a single frame in pixels
 * @property {number} columns - How many frames fit horizontally
 * @property {number} rows - How many frames fit vertically
 * @property {number} frameCount - Total number of frames
 */

/**
 * Create a sprite sheet descriptor for a given PNG sheet.
 *
 * Example usage (after unzipping to /assets/monster/):
 *   const idleSheet = await loadSpriteSheet(
 *     "./assets/monster/Idle.png",
 *     32, 32,   // frame width / height
 *     4, 1      // columns, rows
 *   );
 *
 * @param {string} url - URL to the PNG sprite sheet (relative to index.html)
 * @param {number} frameWidth - Width of one frame
 * @param {number} frameHeight - Height of one frame
 * @param {number} columns - Number of frames per row
 * @param {number} rows - Number of rows
 * @returns {Promise<SpriteSheet>}
 */
export function loadSpriteSheet(url, frameWidth, frameHeight, columns, rows) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const totalFrames = columns * rows;

      /** @type {SpriteSheet} */
      const sheet = {
        image: img,
        frameWidth,
        frameHeight,
        columns,
        rows,
        frameCount: totalFrames
      };

      resolve(sheet);
    };
    img.onerror = (err) => reject(err);
    img.src = url;
  });
}

/**
 * Draw a single frame from a sprite sheet to a 2D canvas context.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {SpriteSheet} sheet
 * @param {number} frameIndex - Which frame to draw (0-based)
 * @param {number} x - Destination x (center by default)
 * @param {number} y - Destination y (center by default)
 * @param {number} [scale=1] - Uniform scale factor
 * @param {boolean} [center=true] - If true, draw centered around (x, y)
 * @param {number} [flipX=1] - 1 (normal) or -1 (horizontal flip)
 */
export function drawSpriteFrame(
  ctx,
  sheet,
  frameIndex,
  x,
  y,
  scale = 1,
  center = true,
  flipX = 1
) {
  if (!sheet || !sheet.image || sheet.frameCount === 0) return;

  const index = ((frameIndex % sheet.frameCount) + sheet.frameCount) % sheet.frameCount;
  const col = index % sheet.columns;
  const row = Math.floor(index / sheet.columns);

  const sx = col * sheet.frameWidth;
  const sy = row * sheet.frameHeight;
  const sw = sheet.frameWidth;
  const sh = sheet.frameHeight;

  const dw = sw * scale;
  const dh = sh * scale;

  ctx.save();

  ctx.translate(x, y);
  ctx.scale(flipX, 1);

  const dx = center ? -dw / 2 : 0;
  const dy = center ? -dh / 2 : 0;

  ctx.drawImage(sheet.image, sx, sy, sw, sh, dx, dy, dw, dh);

  ctx.restore();
}

/**
 * Simple animator helper that advances through frames based on FPS.
 *
 * @param {number} elapsedTime - Time since animation start (seconds)
 * @param {number} fps - Frames per second
 * @param {number} frameCount - Total frames
 * @returns {number} frameIndex - 0-based frame index
 */
export function getFrameIndex(elapsedTime, fps, frameCount) {
  if (frameCount <= 0 || fps <= 0) return 0;
  const total = Math.floor(elapsedTime * fps);
  return total % frameCount;
}
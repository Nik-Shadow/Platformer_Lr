import {
  loadSpriteSheet
} from "../spriteSheetLoader.js";

export const spriteConfig = {
  idle: {
    url: "./Pink_Monster_Idle_4.png",
    frameWidth: 32,
    frameHeight: 32,
    columns: 4,
    rows: 1,
    fps: 6,
    loop: true
  },
  run: {
    url: "./Pink_Monster_Run_6.png",
    frameWidth: 32,
    frameHeight: 32,
    columns: 6,
    rows: 1,
    fps: 10,
    loop: true
  },
  jump: {
    url: "./Pink_Monster_Jump_8.png",
    frameWidth: 32,
    frameHeight: 32,
    columns: 8,
    rows: 1,
    fps: 10,
    loop: true
  },
  hook: {
    // Use the jump sprite sheet for hook mid-air animation (no more climb sheet)
    url: "./Pink_Monster_Jump_8.png",
    frameWidth: 32,
    frameHeight: 32,
    columns: 8,
    rows: 1,
    fps: 10,
    loop: true
  },
  dash: {
    url: "./Pink_Monster_Attack2_6.png",
    frameWidth: 32,
    frameHeight: 32,
    columns: 6,
    rows: 1,
    fps: 14,
    loop: false
  },
  hurt: {
    url: "./Pink_Monster_Hurt_4.png",
    frameWidth: 32,
    frameHeight: 32,
    columns: 4,
    rows: 1,
    fps: 12,
    loop: false
  },
  death: {
    url: "./Pink_Monster_Death_8.png",
    frameWidth: 32,
    frameHeight: 32,
    columns: 8,
    rows: 1,
    fps: 10,
    loop: false
  },
  runDust: {
    url: "./Walk_Run_Push_Dust_6.png",
    frameWidth: 32,
    frameHeight: 32,
    columns: 6,
    rows: 1,
    fps: 18,
    loop: false
  },
  jumpDust: {
    url: "./Double_Jump_Dust_5.png",
    frameWidth: 32,
    frameHeight: 32,
    columns: 5,
    rows: 1,
    fps: 18,
    loop: false
  }
};

/** @type {Record<string, import("../spriteSheetLoader.js").SpriteSheet | null>} */
const sheets = {};
let assetsLoaded = false;

// load all sheets once at module initialization
(function loadAllSheets() {
  const entries = Object.entries(spriteConfig);
  Promise.all(
    entries.map(([key, cfg]) =>
      loadSpriteSheet(
        cfg.url,
        cfg.frameWidth,
        cfg.frameHeight,
        cfg.columns,
        cfg.rows
      ).then(sheet => {
        sheets[key] = sheet;
      }).catch(() => {
        sheets[key] = null;
      })
    )
  ).then(() => {
    assetsLoaded = true;
  });
})();

export function getSheet(key) {
  return sheets[key] || null;
}

export function areSpritesLoaded() {
  return assetsLoaded && !!sheets.idle;
}
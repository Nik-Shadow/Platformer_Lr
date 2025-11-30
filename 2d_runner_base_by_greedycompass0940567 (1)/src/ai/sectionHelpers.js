// Helpers for placing hazards, boosters, and numeric score items in generated sections.

import { randRange } from "./util.js";

export function addSpikes(platform, hazards) {
  const segWidth = platform.width;
  const spikeWidth = segWidth * randRange(0.3, 0.5);
  const margin = segWidth * 0.1;
  const sx = platform.x + randRange(margin, segWidth - spikeWidth - margin);

  const h = {
    type: "spikes",
    x: sx,
    y: platform.y - 10,
    width: spikeWidth,
    height: 10
  };
  hazards.push(h);
  return h;
}

export function addLaser(platform, hazards, baseGroundY) {
  const segWidth = platform.width;
  const margin = segWidth * 0.2;
  const lx = platform.x + randRange(margin, segWidth - margin);

  const height = randRange(80, 140);
  const topY = baseGroundY - height;

  const h = {
    type: "laser",
    x: lx - 4,
    y: topY,
    width: 8,
    height,
    phase: Math.random() * Math.PI * 2
  };
  hazards.push(h);
  return h;
}

export function addSaw(platform, hazards) {
  const segWidth = platform.width;
  const margin = segWidth * 0.2;
  const cx = platform.x + randRange(margin, segWidth - margin);
  const cy = platform.y - 18;
  const radius = 14;

  const h = {
    type: "saw",
    cx,
    cy,
    radius,
    // approximate AABB for some generic checks if needed
    x: cx - radius,
    y: cy - radius,
    width: radius * 2,
    height: radius * 2,
    spin: Math.random() * Math.PI * 2
  };
  hazards.push(h);
  return h;
}

export function addJumpBooster(platform, boosters, unit) {
  const segWidth = platform.width;
  const margin = segWidth * 0.2;
  const bx = platform.x + randRange(margin, segWidth - margin);
  const by = platform.y - 4;

  boosters.push({
    type: "jump",
    x: bx - unit * 0.4,
    y: by - 8,
    width: unit * 0.8,
    height: 12
  });
}

export function addSpeedBooster(platform, boosters, unit) {
  const segWidth = platform.width;
  const margin = segWidth * 0.2;
  const bx = platform.x + randRange(margin, segWidth - margin);
  const by = platform.y - 6;

  boosters.push({
    type: "speed",
    x: bx - unit * 0.5,
    y: by - 4,
    width: unit * 1.0,
    height: 8
  });
}

// Rare grapple charge booster near a hazard
export function addGrappleBoosterNearHazard(boosterList, hazard, unit) {
  const hx = hazard.x + hazard.width / 2;
  const hy = hazard.y;
  const bx = hx;
  const by = hy - unit * randRange(0.6, 1.4);

  boosterList.push({
    type: "grapple",
    x: bx - unit * 0.4,
    y: by - 8,
    width: unit * 0.8,
    height: 16
  });
}

// Risky mid-air grapple booster
export function addFloatingGrappleBooster(boosterList, x, y, unit) {
  boosterList.push({
    type: "grapple",
    x: x - unit * 0.4,
    y: y - 8,
    width: unit * 0.8,
    height: 16
  });
}

// New helpers for numeric score items
export function addScoreItemOnPlatform(bonuses, platform, unit, value, targetY) {
  const segWidth = platform.width;
  const margin = segWidth * 0.2;
  const bx = platform.x + randRange(margin, segWidth - margin);
  const y = (targetY ?? platform.y - unit) - 8;

  bonuses.push({
    type: "bonus",
    x: bx - 8,
    y,
    width: 16,
    height: 16,
    collected: false,
    scoreValue: value
  });
}

export function addScoreItemNearHazard(bonuses, hazard, unit, value) {
  const hx = hazard.x + hazard.width / 2;
  const hy = hazard.y;
  const y = hy - unit * randRange(0.5, 1.2) - 8;

  bonuses.push({
    type: "bonus",
    x: hx - 8,
    y,
    width: 16,
    height: 16,
    collected: false,
    scoreValue: value
  });
}

export function addFloatingScoreItem(bonuses, x, y, unit, value) {
  bonuses.push({
    type: "bonus",
    x: x - 8,
    y: y - 8,
    width: 16,
    height: 16,
    collected: false,
    scoreValue: value
  });
}
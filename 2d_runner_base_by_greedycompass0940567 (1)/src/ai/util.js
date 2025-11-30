// Shared small utilities for AI section generation

export function randRange(min, max) {
  return Math.random() * (max - min) + min;
}

export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}


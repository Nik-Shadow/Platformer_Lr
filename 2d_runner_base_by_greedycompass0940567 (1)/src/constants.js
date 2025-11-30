// Shared game constants and low-level helpers

export const GRAVITY = 1200; // px/s^2
export const UNIT = 48; // virtual "game unit" in pixels

// Player movement / speed
export const RUN_SPEED_BASE = 4 * UNIT; // 4 units/sec
export const RUN_SPEED_MAX = 6 * UNIT; // 6 units/sec
export const RUN_SPEED_ACCEL = 0.6 * UNIT; // units/sec^2 in pixels

// Camera
export const CAMERA_SCALE = 0.5;
// approximate orthographic half-height in world units (conceptual 2D camera size)
export const ORTHOGRAPHIC_SIZE = 16;

// Jump
export const JUMP_HEIGHT_UNITS = 4.9;
export const JUMP_VELOCITY = -Math.sqrt(
  2 * GRAVITY * (JUMP_HEIGHT_UNITS * UNIT)
); // px/s

// Hook
export const HOOK_RADIUS = 30 * UNIT; // 30 units (long vertical reach)
export const HOOK_PULL_STRENGTH = 800; // px/s^2
export const HOOK_ENERGY_DRAIN = 0.25; // per second when active

// Dash
export const DASH_DISTANCE_UNITS = 8; // dash distance in units
export const DASH_ENERGY_COST = 0.35; // energy cost per dash
export const DASH_SPEED = 20 * UNIT; // additional horizontal speed from dash

// Simple RNG helper
export function randRange(min, max) {
  return Math.random() * (max - min) + min;
}

// Simple AABB collision helper
export function aabbIntersect(a, b) {
  return !(
    a.x + a.width < b.x ||
    a.x > b.x + b.width ||
    a.y + a.height < b.y ||
    a.y > b.y + b.height
  );
}
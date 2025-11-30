// Dash handling extracted from controllerCore with its own internal state.

import {
  UNIT,
  DASH_DISTANCE_UNITS,
  DASH_ENERGY_COST,
  DASH_SPEED
} from "../constants.js";

export function createDashSystem(player, getLastMoveDir) {
  let lastDashInput = false;

  function tryDash(dashInput) {
    if (!player.alive || player.deathStarted) {
      lastDashInput = dashInput;
      return;
    }
    const justPressed = dashInput && !lastDashInput;

    const lastMoveDir = getLastMoveDir();

    if (justPressed && player.energy >= DASH_ENERGY_COST && lastMoveDir !== 0) {
      // spend energy
      player.energy = Math.max(0, player.energy - DASH_ENERGY_COST);

      // move instantly by 8 units in last move direction
      const dashDistance = DASH_DISTANCE_UNITS * UNIT * lastMoveDir;
      player.x += dashDistance;

      // add strong horizontal impulse so dash affects flight trajectory
      player.vx += lastMoveDir * DASH_SPEED;

      // visual dash effect timer and state on player sprite (used for dash wave)
      player.dashEffectTime = 0.25;
      player.isDashingTimer = 0.2;
      player.isDashing = true;
      player.justDashed = true;
    }

    lastDashInput = dashInput;
  }

  return {
    tryDash
  };
}
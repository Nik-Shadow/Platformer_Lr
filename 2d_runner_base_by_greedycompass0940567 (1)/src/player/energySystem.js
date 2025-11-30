// Energy / stamina update logic for the player controller.

import { RUN_SPEED_BASE } from "../constants.js";

export function updateEnergy(player, dt) {
  if (!player.alive || player.deathStarted) return;

  // base energy change
  const energyDrain = 0.03 * dt;
  const energyRecover = player.onGround ? 0.05 * dt : 0;

  // energy gained from movement (more speed => more gain)
  const speed = Math.abs(player.vx);
  const movementGainRate = 0.12; // base gain per second at normal run speed
  const movementFactor = Math.min(speed / RUN_SPEED_BASE, 2); // cap influence
  const movementGain = movementGainRate * movementFactor * dt;

  // hook does NOT affect stamina anymore
  const hookDrain = 0;

  player.energy = Math.min(
    1,
    Math.max(0, player.energy - energyDrain - hookDrain + energyRecover + movementGain)
  );
}
import {
  GRAVITY,
  UNIT,
  RUN_SPEED_BASE,
  RUN_SPEED_MAX,
  RUN_SPEED_ACCEL,
  JUMP_VELOCITY,
  HOOK_RADIUS,
  HOOK_PULL_STRENGTH,
  HOOK_ENERGY_DRAIN,
  DASH_DISTANCE_UNITS,
  DASH_ENERGY_COST,
  DASH_SPEED
} from "../constants.js";
import { updateEnergy } from "./energySystem.js";
import { createDashSystem } from "./dashSystem.js";

export function createPlayerControllerImpl(player, getPlatforms, getSpeedState) {
  // horizontal auto-run has been removed; we now use direct input-based movement
  let lastJumpInput = false;
  let lastHookInput = false;
  let lastMoveDir = 1; // 1 = right, -1 = left
  /** @type {{x:number,y:number}|null} */
  let hookPoint = null;
  let lastHookHang = false;
  let lastHookPull = false;
  /** Fixed rope length used during LMB hang (pendulum mode) */
  let ropeLength = null;

  // Current platforms reference for this frame (updated in update())
  let platformsRef = getPlatforms ? getPlatforms() : [];

  // Variable jump height helpers
  const MAX_JUMP_BOOST_TIME = 0.18;
  const INITIAL_JUMP_VELOCITY = JUMP_VELOCITY * 0.55; // smaller initial hop
  const TARGET_JUMP_VELOCITY = JUMP_VELOCITY; // full jump matches original height
  let jumpBoostTimer = 0;

  const dashSystem = createDashSystem(player, () => lastMoveDir);

  function applyPhysics(dt, moveDir) {
    if (!player.alive || player.deathStarted) {
      // when dead/dying, stop horizontal control but keep gravity
      player.vx = 0;
      player.vy += GRAVITY * dt;
      player.x += player.vx * dt;
      player.y += player.vy * dt;
      return;
    }

    const isHanging = player.hookActive && player.hookMode === "hang";
    const isPullingOrClinging = player.hookActive && player.hookMode === "pull";

    // compute speed multiplier for temporary speed booster
    const speedMultiplier = player.speedBoostTimer && player.speedBoostTimer > 0 ? 1.5 : 1;

    // Pendulum mode (LMB hang): physics constrained to a circle around hookPoint
    if (isHanging && hookPoint) {
      // ensure we have a fixed rope length
      if (ropeLength == null) {
        const dx0 = player.x - hookPoint.x;
        const dy0 = player.y - hookPoint.y;
        const dist0 = Math.hypot(dx0, dy0);
        ropeLength = dist0 > 1e-3 ? dist0 : 0;
      }

      // if rope length is degenerate, just behave like free fall
      if (!ropeLength || ropeLength <= 1e-3) {
        // normal free movement with gravity
        if (moveDir !== 0) {
          player.vx = moveDir * RUN_SPEED_MAX;
        } else {
          player.vx = 0;
        }
        player.vy += GRAVITY * dt;
        player.x += player.vx * dt;
        player.y += player.vy * dt;
      } else {
        // radial direction from hook to player
        let rx = player.x - hookPoint.x;
        let ry = player.y - hookPoint.y;
        let dist = Math.hypot(rx, ry);

        // guard against numerical issues
        if (dist < 1e-4) {
          dist = ropeLength;
          rx = 0;
          ry = ropeLength;
        }

        let radialDirX = rx / dist;
        let radialDirY = ry / dist;

        // current velocity vector
        let vx = player.vx;
        let vy = player.vy;

        // remove any radial component of velocity
        const radialSpeed = vx * radialDirX + vy * radialDirY;
        vx -= radialDirX * radialSpeed;
        vy -= radialDirY * radialSpeed;

        // tangent direction is perpendicular to radialDir
        let tangentX = -radialDirY;
        let tangentY = radialDirX;

        // gravity projected onto tangent direction
        const gX = 0;
        const gY = GRAVITY;
        const tangentialAccelFromGravity = gX * tangentX + gY * tangentY;
        vx += tangentX * tangentialAccelFromGravity * dt;
        vy += tangentY * tangentialAccelFromGravity * dt;

        // A/D input adds tangential acceleration along the circular path
        if (moveDir !== 0) {
          const TANGENT_ACCEL = RUN_SPEED_ACCEL * 8;

          // Determine desired world-space horizontal direction (-1 = left, 1 = right)
          const desiredHorizontalDir = moveDir < 0 ? -1 : 1;

          // Current tangent's horizontal direction in world space
          const tangentHorizontalDir = Math.sign(tangentX || 1);

          // If tangent points the same way as desired horizontal, go "forward" along tangent,
          // otherwise go "backward" along tangent so that A = left, D = right in world space.
          const accelSign =
            tangentHorizontalDir === desiredHorizontalDir ? 1 : -1;

          vx += tangentX * accelSign * TANGENT_ACCEL * dt;
          vy += tangentY * accelSign * TANGENT_ACCEL * dt;
        }

        // integrate position with updated velocity
        let newX = player.x + vx * dt;
        let newY = player.y + vy * dt;

        // enforce fixed rope length constraint
        let cx = newX - hookPoint.x;
        let cy = newY - hookPoint.y;
        let cdist = Math.hypot(cx, cy);

        if (cdist < 1e-4) {
          // keep previous radial direction if projection degenerates
          cx = radialDirX * ropeLength;
          cy = radialDirY * ropeLength;
          cdist = ropeLength;
        }

        const corrX = (cx / cdist) * ropeLength;
        const corrY = (cy / cdist) * ropeLength;

        player.x = hookPoint.x + corrX;
        player.y = hookPoint.y + corrY;

        // store back constrained velocity
        player.vx = vx;
        player.vy = vy;
      }
    } else if (isPullingOrClinging && hookPoint) {
      // hook pull / cling movement (Q+LMB pull mode remains unchanged)
      const dx = hookPoint.x - player.x;
      const dy = hookPoint.y - player.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 2) {
        const nx = dx / dist;
        const ny = dy / dist;
        const pullSpeed = HOOK_PULL_STRENGTH; // use as a pull speed in px/s
        const step = Math.min(dist, pullSpeed * dt);
        player.x += nx * step;
        player.y += ny * step;
      } else {
        // cling exactly to the hook point
        player.x = hookPoint.x;
        player.y = hookPoint.y;
      }

      // while pulling/clinging, velocities are not used
      player.vx = 0;
      player.vy = 0;
    } else {
      // normal free movement (no hook constraint)
      // horizontal movement is directly controlled by A/D input
      // speed matches the old maximum run speed (~6 units/sec)
      if (moveDir !== 0) {
        player.vx = moveDir * RUN_SPEED_MAX * speedMultiplier;
      } else {
        player.vx = 0;
      }

      // gravity applied normally
      player.vy += GRAVITY * dt;

      // integrate normal movement
      player.x += player.vx * dt;
      player.y += player.vy * dt;
    }

    // clamp maximum velocities for stability
    const maxVx = RUN_SPEED_MAX * 1.5 * speedMultiplier;
    const maxVy = 2000;
    if (player.vx > maxVx) player.vx = maxVx;
    if (player.vx < -maxVx) player.vx = -maxVx;
    if (player.vy > maxVy) player.vy = maxVy;
    if (player.vy < -maxVy) player.vy = -maxVy;

    // track last horizontal move direction from velocity (for sprite facing & dash)
    if (Math.abs(player.vx) > 1) {
      lastMoveDir = player.vx > 0 ? 1 : -1;
    }
    player.facing = lastMoveDir;
  }

  function resolveCollisions() {
    const platforms = platformsRef;

    player.onGround = false;

    const playerBottom = player.y + player.height / 2;
    const playerTop = player.y - player.height / 2;
    const playerLeft = player.x - player.radius;
    const playerRight = player.x + player.radius;

    /** track which platform we are currently standing on for hook ignore logic */
    let newGroundPlatform = null;

    for (const platform of platforms) {
      // hook-only grapple points / nodes should not collide with the player
      if (platform.type === "hookPoint" || platform.type === "hookNode") continue;

      const platTop = platform.y;
      const platLeft = platform.x;
      const platRight = platform.x + platform.width;

      const horizontallyOver = playerRight > platLeft && playerLeft < platRight;

      // Skip collision with the platform we are intentionally dropping through
      if (player.dropThroughPlatform && platform === player.dropThroughPlatform) {
        // once we are clearly below its top, re-enable collisions
        if (playerTop > platTop + 4) {
          player.dropThroughPlatform = null;
        }
        continue;
      }

      if (
        horizontallyOver &&
        playerBottom >= platTop &&
        playerTop < platTop &&
        player.vy >= 0
      ) {
        const penetration = playerBottom - platTop;
        // thin platforms behave like normal floors but are one-way by design
        player.y -= penetration;
        player.vy = 0;
        player.onGround = true;
        newGroundPlatform = platform;
      }
    }

    // remember which platform we are standing on (used to ignore ground for hook)
    player.groundPlatform = player.onGround ? newGroundPlatform : null;
  }

  function tryJump(dt, jumpInput) {
    if (!player.alive || player.deathStarted) {
      lastJumpInput = jumpInput;
      return;
    }
    const justPressed = jumpInput && !lastJumpInput;

    if (justPressed && player.onGround && player.energy > 0.1) {
      // start a variable jump: small initial hop, then optional boost while held
      player.vy = INITIAL_JUMP_VELOCITY;
      player.onGround = false;
      jumpBoostTimer = MAX_JUMP_BOOST_TIME;
    } else if (!jumpInput) {
      // releasing cancels any remaining boost
      jumpBoostTimer = 0;
    }

    // apply additional upward velocity while the jump button is held
    if (jumpInput && jumpBoostTimer > 0 && player.vy < 0) {
      const usedTime = MAX_JUMP_BOOST_TIME - jumpBoostTimer;
      const t = Math.max(0, Math.min(1, usedTime / MAX_JUMP_BOOST_TIME));
      const desiredVy =
        INITIAL_JUMP_VELOCITY +
        (TARGET_JUMP_VELOCITY - INITIAL_JUMP_VELOCITY) * t;

      if (player.vy > desiredVy) {
        // make the jump stronger (more negative) up to the desired curve
        player.vy = desiredVy;
      }

      jumpBoostTimer = Math.max(0, jumpBoostTimer - dt);
    }

    lastJumpInput = jumpInput;
  }

  function tryHook(input) {
    const platforms = platformsRef;

    if (!player.alive || player.deathStarted) {
      lastHookInput = !!(input && input.hook);
      lastHookHang = !!(input && input.hookHang);
      lastHookPull = !!(input && input.hookPull);
      return;
    }

    const hookPressed = !!(input && input.hook);
    const hangPressed = !!(input && input.hookHang);
    let pullPressed = !!(input && input.hookPull);

    // if no charges left, ignore pullPressed so E+LMB behaves like normal LMB
    if ((player.grappleChargesMax || 0) > 0 && (player.grappleCharges || 0) <= 0) {
      pullPressed = false;
    }

    // If neither hang nor pull is currently held, release any existing hook
    if (player.hookActive) {
      if (player.hookMode === "pull") {
        // pull/cling mode requires BOTH E (pullPressed) and LMB (hangPressed)
        // releasing LMB always cancels; releasing E downgrades to a passive hang
        if (!hangPressed) {
          player.hookActive = false;
          player.hookMode = "none";
          hookPoint = null;
          ropeLength = null;
        } else if (!pullPressed) {
          player.hookMode = "hang";
          // when transitioning from pull to hang, capture the current rope length
          if (hookPoint) {
            const dx = player.x - hookPoint.x;
            const dy = player.y - hookPoint.y;
            ropeLength = Math.hypot(dx, dy);
          } else {
            ropeLength = null;
          }
        }
      } else {
        // normal hang only depends on LMB
        if (!hangPressed) {
          player.hookActive = false;
          player.hookMode = "none";
          hookPoint = null;
          ropeLength = null;
        }
      }
    }

    if (hookPressed && hangPressed && input) {
      const targetX = input.hookX;
      const targetY = input.hookY;

      // ray from player to input point in world coordinates
      const dirX0 = targetX - player.x;
      const dirY0 = targetY - player.y;
      const dirLen = Math.hypot(dirX0, dirY0);

      if (dirLen > 1e-3) {
        const dirX = dirX0 / dirLen;
        const dirY = dirY0 / dirLen;

        const maxDist = HOOK_RADIUS;
        const minDist = 0.5 * UNIT; // minimum distance before allowing a hit

        let bestPointLocal = null;
        let bestRayT = Infinity;

        const currentGround = player.groundPlatform || null;
        const epsilonY = 2; // small tolerance to differentiate "ground under" vs "above"

        for (const platform of platforms) {
          if (!platform.hookable) continue;

          // Raycast must ignore the platform the player is currently standing on
          if (currentGround && platform === currentGround) continue;

          // HookNodes: treat center as a hook point if within ray
          if (platform.type === "hookNode") {
            const centerX = platform.x + platform.width / 2;
            const centerY = platform.y;
            const vx = centerX - player.x;
            const vy = centerY - player.y;
            const proj = vx * dirX + vy * dirY;
            if (proj <= 0 || proj > maxDist) continue;
            if (proj < minDist) continue;
            const perpSq = vx * vx + vy * vy - proj * proj;
            const radius = platform.width; // small tolerance
            if (perpSq > radius * radius) continue;
            if (proj < bestRayT) {
              bestRayT = proj;
              bestPointLocal = { x: centerX, y: centerY };
            }
          } else {
            // intersect ray with the top edge of the platform (treated as a segment)
            const platTopY = platform.y;

            // never hook to the ground surface under or at our feet
            if (platTopY >= player.y - epsilonY) continue;

            const denom = dirY;

            // if ray is almost parallel to the top edge, skip
            if (Math.abs(denom) < 1e-4) continue;

            const t = (platTopY - player.y) / denom;
            if (t <= 0 || t > maxDist) continue;
            if (t < minDist) continue;

            const hitX = player.x + dirX * t;
            if (hitX < platform.x || hitX > platform.x + platform.width) continue;

            if (t < bestRayT) {
              bestRayT = t;
              bestPointLocal = { x: hitX, y: platTopY };
            }
          }
        }

        if (bestPointLocal && bestRayT <= maxDist) {
          hookPoint = bestPointLocal;
          player.hookActive = true;
          player.hookX = bestPointLocal.x;
          player.hookY = bestPointLocal.y;
          // choose mode: E + LMB = pull/cling (consumes a charge), otherwise pendulum hang
          if (pullPressed && (player.grappleCharges || 0) > 0) {
            player.hookMode = "pull";
            ropeLength = null;
            // consume one grapple dash charge
            player.grappleCharges = Math.max(
              0,
              Math.min(
                player.grappleChargesMax || Infinity,
                (player.grappleCharges || 0) - 1
              )
            );
          } else {
            player.hookMode = "hang";
            const dx = player.x - hookPoint.x;
            const dy = player.y - hookPoint.y;
            ropeLength = Math.hypot(dx, dy);
          }
          // reset vertical velocity when attaching
          player.vy = 0;
        } else {
          // no valid hook target hit: ensure hook is not active
          player.hookActive = false;
          player.hookMode = "none";
          hookPoint = null;
          ropeLength = null;
        }
      }
    }

    lastHookInput = hookPressed;
    lastHookHang = hangPressed;
    lastHookPull = pullPressed;

    // release hook if out of range
    if (player.hookActive && hookPoint) {
      const dx = hookPoint.x - player.x;
      const dy = hookPoint.y - player.y;
      const dist = Math.hypot(dx, dy);

      if (dist > HOOK_RADIUS + 10) {
        player.hookActive = false;
        player.hookMode = "none";
        hookPoint = null;
        ropeLength = null;
      }
    }
  }

  function update(dt, input) {
    // refresh current platforms reference for this frame (supports multi-world)
    if (getPlatforms) {
      platformsRef = getPlatforms() || [];
    }

    updateEnergy(player, dt);
    // tick down dash visual timer
    if (player.dashEffectTime > 0) {
      player.dashEffectTime = Math.max(0, player.dashEffectTime - dt);
    }

    // handle dropping through thin platforms when requested
    const dropDown = input && !!input.dropDown;
    if (
      dropDown &&
      player.onGround &&
      player.groundPlatform &&
      player.groundPlatform.type === "thin"
    ) {
      // mark current thin platform to be ignored until we fall below it
      player.dropThroughPlatform = player.groundPlatform;
      player.onGround = false;
      // give a tiny nudge downwards so we start falling through
      if (player.vy < 50) {
        player.vy = 50;
      }
    }

    // read horizontal movement input
    const moveDir = input && typeof input.moveDir === "number" ? input.moveDir : 0;
    // try hook / dash / jump in order of priority
    tryHook(input);
    dashSystem.tryDash(input && input.dash);
    tryJump(dt, input && input.jump);
    applyPhysics(dt, moveDir);
    resolveCollisions();
  }

  return {
    update
  };
}
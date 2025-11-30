import { UNIT, aabbIntersect, RUN_SPEED_MAX, CAMERA_SCALE, JUMP_VELOCITY } from "./constants.js";
import { createPlayerController } from "./playerController.js";
import { createLevelManager } from "./levelManager.js";

export function createWorld() {
  // level layouts for dimensions A and B (initial seed platforms only)
  const levelLayouts = {
    A: [
      {
        x: 40,
        y: 200,
        width: 400,
        height: 40
      }
    ],
    B: [
      {
        x: 20,
        y: 210,
        width: 200,
        height: 40
      },
      {
        x: 260,
        y: 170,
        width: 260,
        height: 40
      }
    ]
  };

  // Shared player (exists in both worlds at the same coordinates)
  const baseLayoutA = levelLayouts.A[0];
  const player = {
    x: baseLayoutA.x + baseLayoutA.width * 0.25,
    y: baseLayoutA.y - 60, // initial above ground, will fall onto it
    radius: 18,
    height: 1.2 * UNIT, // ~1.2 units tall visually
    vx: 0,
    vy: 0,
    onGround: false,
    energy: 1, // 0..1
    hookActive: false,
    hookX: 0,
    hookY: 0,
    hookMode: "none", // "none" | "hang" | "pull"
    dashEffectTime: 0,
    // animation / state
    animState: "idle",
    animTime: 0,
    damageTimer: 0,
    alive: true,
    facing: 1,
    cameraX: 0,
    cameraY: 0,
    // dash & death helpers
    isDashing: false,
    isDashingTimer: 0,
    justDashed: false,
    deathStarted: false,
    deathTimer: 0,
    // FX helpers
    runDustCooldown: 0,
    wasOnGround: false,
    /** reference to the platform we are currently standing on (for hook ignore) */
    groundPlatform: null,
    /** short fade effect when teleport (Q) is pressed */
    teleportFadeTimer: 0,
    teleportFadeDuration: 0.25,
    /** thin platform we are currently dropping through */
    dropThroughPlatform: null,
    /** temporary speed boost timer (seconds) */
    speedBoostTimer: 0,
    /** limited-use grapple dash charges (for E + LMB pull) */
    grappleCharges: 2,
    grappleChargesMax: 5
  };

  function createLayer(initialLayout) {
    const platforms = [];
    const hazards = [];
    const bonuses = [];
    const boosters = [];

    // base static platforms
    for (const p of initialLayout) {
      platforms.push({
        x: p.x,
        y: p.y,
        width: p.width,
        height: p.height,
        type: "static",
        hookable: true
      });
    }

    const speedState = {
      multiplier: 1,
      difficulty: 0,
      score: 0,
      lastStyle: null
    };

    // simple FX containers for dust and dash waves
    const fx = {
      runDust: [],
      jumpDust: [],
      dashWaves: [],
      teleportBursts: [],
      floatingNumbers: [],
      grappleTexts: []
    };

    // simple FX object pools to reduce allocations
    const fxPools = {
      runDust: [],
      jumpDust: [],
      dashWaves: [],
      teleportBursts: [],
      floatingNumbers: [],
      grappleTexts: []
    };

    // elapsed time for systems like the chasing fire wall
    const layerState = {
      elapsedTime: 0
    };

    // Chasing fire wall that starts behind the player and speeds up over time
    const firstPlat = platforms[0];
    const fireWall = {
      x: (firstPlat?.x ?? 0) - 20 * UNIT,
      y: -3000,
      width: 80,
      height: 6000,
      speed: 0
    };

    const levelManager = createLevelManager(
      platforms,
      hazards,
      bonuses,
      speedState,
      player,
      boosters
    );

    return {
      platforms,
      hazards,
      bonuses,
      boosters,
      speedState,
      fx,
      fxPools,
      fireWall,
      levelManager,
      layerState
    };
  }

  // Create two independent layers / worlds
  const layers = {
    A: createLayer(levelLayouts.A),
    B: createLayer(levelLayouts.B)
  };

  let currentDimension = "A";

  function getActiveLayer() {
    return layers[currentDimension];
  }

  const controller = createPlayerController(
    player,
    () => getActiveLayer().platforms,
    () => getActiveLayer().speedState
  );

  let lastToggleDimension = false;

  function findSafePlayerPosition() {
    const { platforms } = getActiveLayer();

    let targetX = player.x;
    let bestY = null;
    let bestPlatform = null;

    // Prefer platforms directly under the player horizontally
    for (const plat of platforms) {
      const platLeft = plat.x;
      const platRight = plat.x + plat.width;
      if (targetX >= platLeft && targetX <= platRight) {
        const surfaceY = plat.y - player.height / 2;
        if (bestY === null || surfaceY < bestY) {
          bestY = surfaceY;
          bestPlatform = plat;
        }
      }
    }

    // If none directly under, find closest surface by distance
    if (!bestPlatform) {
      let bestDist = Infinity;
      for (const plat of platforms) {
        const centerX = plat.x + plat.width / 2;
        const surfaceY = plat.y - player.height / 2;
        const dx = centerX - targetX;
        const dy = surfaceY - player.y;
        const dist = Math.hypot(dx, dy);
        if (dist < bestDist) {
          bestDist = dist;
          bestPlatform = plat;
          bestY = surfaceY;
          targetX = centerX;
        }
      }
    }

    if (bestPlatform && bestY != null) {
      player.x = targetX;
      player.y = bestY;
      player.vy = 0;
      player.onGround = true;
    }
  }

  function switchDimension() {
    // disable hook when shifting
    player.hookActive = false;

    // trigger a short teleport visual effect at the player's current position
    const activeLayerBefore = getActiveLayer();
    activeLayerBefore.fx.teleportBursts.push({
      x: player.x,
      y: player.y,
      t: 0,
      duration: 0.25
    });
    player.teleportFadeTimer = player.teleportFadeDuration;

    // switch active dimension (world state is preserved)
    currentDimension = currentDimension === "A" ? "B" : "A";

    // add teleport burst in the new world as well, so the arrival is visible
    const activeLayerAfter = getActiveLayer();
    activeLayerAfter.fx.teleportBursts.push({
      x: player.x,
      y: player.y,
      t: 0,
      duration: 0.25
    });

    // find a safe surface in the new world at the same X (if any)
    findSafePlayerPosition();
  }

  function handleHazardsAndBonuses(dt) {
    const { hazards, bonuses, boosters, fx, fxPools, fireWall } = getActiveLayer();

    // player AABB for simple checks
    const pBox = {
      x: player.x - player.radius,
      y: player.y - player.height / 2,
      width: player.radius * 2,
      height: player.height
    };

    for (const h of hazards) {
      if (h.type === "laser") {
        // laser is active only when sin(phase) > 0.2
        if (Math.sin(h.phase) <= 0.2) continue;
      }

      let hit = false;

      if (h.type === "saw") {
        // use AABB overlap for saws so any contact (top/side/bottom) deals damage
        if (aabbIntersect(pBox, h)) {
          hit = true;
        }
      } else if (h.type === "laser" || h.type === "spikes") {
        if (aabbIntersect(pBox, h)) {
          hit = true;
        }
      }

      if (hit) {
        // simple penalty: lose a chunk of energy and small push up to stop repeated hits
        player.energy = Math.max(0, player.energy - 0.4);
        player.vy = -300;
        // trigger short damage animation
        player.damageTimer = 0.3;
      }
    }

    for (const b of bonuses) {
      if (b.collected) continue;
      if (aabbIntersect(pBox, b)) {
        b.collected = true;

        const value = typeof b.scoreValue === "number" ? b.scoreValue : 10;

        // spawn floating number FX that will add to score on completion
        const fxEntry =
          fxPools.floatingNumbers.pop() || {
            x: 0,
            y: 0,
            t: 0,
            duration: 0.5,
            value: 0
          };
        fxEntry.x = b.x + b.width / 2;
        fxEntry.y = b.y;
        fxEntry.t = 0;
        fxEntry.duration = 0.5;
        fxEntry.value = value;
        fx.floatingNumbers.push(fxEntry);
      }
    }

    // boosters
    for (const bo of boosters) {
      if (!aabbIntersect(pBox, bo)) continue;

      if (bo.type === "jump") {
        // strong upward launch with a springy feel
        const boostMultiplier = 1.8;
        const targetVy = JUMP_VELOCITY * boostMultiplier;
        if (player.vy > targetVy) {
          player.vy = targetVy;
        }
        // small visual cue via teleport-like burst
        fx.teleportBursts.push({
          x: player.x,
          y: player.y + player.height / 2,
          t: 0,
          duration: 0.2
        });
      } else if (bo.type === "speed") {
        // refresh speed boost duration, do not stack strength
        player.speedBoostTimer = 3.0;
      } else if (bo.type === "grapple") {
        // increase grapple charges with a cap
        if (player.grappleCharges < player.grappleChargesMax) {
          player.grappleCharges = Math.min(
            player.grappleChargesMax,
            player.grappleCharges + 1
          );
        }

        // small energy burst effect at booster position
        fx.teleportBursts.push({
          x: bo.x + bo.width / 2,
          y: bo.y + bo.height / 2,
          t: 0,
          duration: 0.2
        });

        // floating "+1" text for grapple charge
        const g =
          fxPools.grappleTexts.pop() || {
            x: 0,
            y: 0,
            t: 0,
            duration: 0.6,
            text: ""
          };
        g.x = bo.x + bo.width / 2;
        g.y = bo.y;
        g.t = 0;
        g.duration = 0.6;
        g.text = "+1";
        fx.grappleTexts.push(g);
      }
    }

    // fire wall instantly kills the player on contact
    if (aabbIntersect(pBox, fireWall) && !player.deathStarted && player.alive) {
      player.deathStarted = true;
      player.deathTimer = 1.0;
      player.hookActive = false;
      player.energy = 0;
    }
  }

  function updateScoreAndDifficulty() {
    const { speedState } = getActiveLayer();
    const distanceScore = Math.floor(player.x / UNIT);
    if (distanceScore > speedState.score) {
      speedState.score = distanceScore;
    }

    const newDifficulty = Math.floor(speedState.score / 1000);
    if (newDifficulty !== speedState.difficulty) {
      speedState.difficulty = newDifficulty;
      speedState.multiplier = 1 + newDifficulty * 0.2;
    }
  }

  function updateAnimator(dt) {
    // update timers
    if (player.damageTimer > 0) {
      player.damageTimer = Math.max(0, player.damageTimer - dt);
    }
    if (player.isDashingTimer > 0) {
      player.isDashingTimer = Math.max(0, player.isDashingTimer - dt);
    }
    player.isDashing = player.isDashingTimer > 0;

    player.animTime += dt;

    let nextState = player.animState;

    // Animator state machine (priority-based):
    // Death > Hurt > Dash > Hook > Jump/Fall > Run > Idle
    const verticalVelocity = -player.vy; // interpret upward motion as positive
    const speed = Math.abs(player.vx);
    const onGround = player.onGround;

    if (!player.alive || player.deathStarted) {
      nextState = "death";
    } else if (player.damageTimer > 0) {
      nextState = "hurt";
    } else if (player.isDashing) {
      nextState = "dash";
    } else if (player.hookActive) {
      nextState = "hook";
    } else if (!onGround || Math.abs(verticalVelocity) > 0.1) {
      nextState = "jump";
    } else if (onGround && speed > 0.1) {
      nextState = "run";
    } else {
      nextState = "idle";
    }

    if (nextState !== player.animState) {
      player.animState = nextState;
      player.animTime = 0;
    }
  }

  function checkDeath(dt) {
    // death by energy depletion
    if (!player.deathStarted && player.energy <= 0) {
      player.deathStarted = true;
      player.deathTimer = 1.0;
      player.hookActive = false;
    }
    // death by falling far below the playfield
    if (!player.deathStarted && player.y > 600) {
      player.deathStarted = true;
      player.deathTimer = 1.0;
      player.hookActive = false;
    }
    // death by flying too high above the playfield
    // if (!player.deathStarted && player.y < -10) {
    //   player.deathStarted = true;
    //   player.deathTimer = 1.0;
    //   player.hookActive = false;
    // }

    if (player.deathStarted) {
      player.deathTimer = Math.max(0, player.deathTimer - dt);
      if (player.deathTimer === 0 && player.alive) {
        player.alive = false;
      }
    }
  }

  function updateFX(dt) {
    const { fx, fxPools } = getActiveLayer();

    // running dust while grounded & moving
    if (player.onGround && Math.abs(player.vx) > 0.1 && !player.deathStarted) {
      player.runDustCooldown -= dt;
      if (player.runDustCooldown <= 0) {
        player.runDustCooldown = 0.15;
        const puff =
          fxPools.runDust.pop() ||
          { x: 0, y: 0, t: 0, duration: 0.4 };
        puff.x = player.x - player.facing * (player.radius * 0.6);
        // spawn slightly above the feet instead of inside the ground
        puff.y = player.y + player.height / 2 - 0.25 * UNIT;
        puff.t = 0;
        puff.duration = 0.4;
        fx.runDust.push(puff);
      }
    } else {
      player.runDustCooldown = 0;
    }

    // jump dust when leaving ground
    if (player.wasOnGround && !player.onGround && !player.deathStarted) {
      const puff =
        fxPools.jumpDust.pop() ||
        { x: 0, y: 0, t: 0, duration: 0.35 };
      puff.x = player.x;
      puff.y = player.y + player.height / 2;
      puff.t = 0;
      puff.duration = 0.35;
      fx.jumpDust.push(puff);
    }
    player.wasOnGround = player.onGround;

    // dash wave effect on each dash
    if (player.justDashed) {
      player.justDashed = false;
      const wave =
        fxPools.dashWaves.pop() ||
        { x: 0, y: 0, t: 0, duration: 0.25 };
      wave.x = player.x;
      wave.y = player.y;
      wave.t = 0;
      wave.duration = 0.25;
      fx.dashWaves.push(wave);
    }

    // teleport visual effect timers
    if (player.teleportFadeTimer > 0) {
      player.teleportFadeTimer = Math.max(
        0,
        player.teleportFadeTimer - dt
      );
    }

    // advance & cull FX with simple pooling
    const advanceList = (list, pool) => {
      for (let i = list.length - 1; i >= 0; i--) {
        const e = list[i];
        e.t += dt;
        if (e.t >= e.duration) {
          list.splice(i, 1);
          pool.push(e);
        }
      }
    };

    advanceList(fx.runDust, fxPools.runDust);
    advanceList(fx.jumpDust, fxPools.jumpDust);
    advanceList(fx.dashWaves, fxPools.dashWaves);
    advanceList(fx.teleportBursts, fxPools.teleportBursts);

    // floating score numbers: when they finish, apply score and recycle
    for (let i = fx.floatingNumbers.length - 1; i >= 0; i--) {
      const e = fx.floatingNumbers[i];
      e.t += dt;
      if (e.t >= e.duration) {
        const value = typeof e.value === "number" ? e.value : 0;
        getActiveLayer().speedState.score += value;
        fx.floatingNumbers.splice(i, 1);
        fxPools.floatingNumbers.push(e);
      }
    }

    // grapple "+1" texts: purely visual, just recycle after lifetime
    for (let i = fx.grappleTexts.length - 1; i >= 0; i--) {
      const e = fx.grappleTexts[i];
      e.t += dt;
      if (e.t >= e.duration) {
        fx.grappleTexts.splice(i, 1);
        fxPools.grappleTexts.push(e);
      }
    }
  }

  function update(dt, input) {
    const toggle = !!(input && input.toggleDimension);
    if (toggle && !lastToggleDimension) {
      switchDimension();
    }
    lastToggleDimension = toggle;

    const { fireWall, levelManager, layerState } = getActiveLayer();

    // track per-world elapsed time
    layerState.elapsedTime += dt;

    // update chasing fire wall speed and position only in active world
    const t = Math.max(0, Math.min(1, layerState.elapsedTime / 180)); // clamp 0..1 over 180 seconds
    const minSpeed = 0.5 * UNIT;
    const maxSpeed = RUN_SPEED_MAX * 0.95;
    fireWall.speed = minSpeed + (maxSpeed - minSpeed) * t;
    fireWall.x += fireWall.speed * dt;

    levelManager.update(dt);

    // make sure hook ray uses world coordinates (input is already in world space)
    controller.update(dt, input || {
      jump: false,
      hook: false,
      hookX: 0,
      hookY: 0,
      dash: false,
      moveDir: 0,
      hookHang: false,
      hookPull: false,
      dropDown: false
    });
    handleHazardsAndBonuses(dt);
    checkDeath(dt);
    updateScoreAndDifficulty();
    updateAnimator(dt);
    updateFX(dt);

    // decrement speed boost timer after other updates
    if (player.speedBoostTimer > 0) {
      player.speedBoostTimer = Math.max(0, player.speedBoostTimer - dt);
    }

    // camera follow with smooth movement, centered on the player
    const viewWidth = 480 / CAMERA_SCALE;
    const viewHeight = 270 / CAMERA_SCALE;

    // compute target camera so player is roughly centered
    let targetCameraX = player.x - viewWidth / 2;
    let targetCameraY = player.y - viewHeight / 2;

    // never scroll before the start of the world
    targetCameraX = Math.max(0, targetCameraX);

    // smoothing factor ~0.1 for orthographic-style follow
    const lerpFactor = 0.1;
    player.cameraX += (targetCameraX - player.cameraX) * lerpFactor;
    player.cameraY += (targetCameraY - player.cameraY) * lerpFactor;
  }

  function updateGameOver(dt) {
    // during game over, keep death animation progressing but stop gameplay
    updateAnimator(dt);
  }

  return {
    player,
    // expose active layer arrays via getters so renderer & systems always see current world
    get platform() {
      const { platforms } = getActiveLayer();
      return platforms[0];
    },
    get platforms() {
      return getActiveLayer().platforms;
    },
    get hazards() {
      return getActiveLayer().hazards;
    },
    get bonuses() {
      return getActiveLayer().bonuses;
    },
    get fx() {
      return getActiveLayer().fx;
    },
    controller,
    get fireWall() {
      return getActiveLayer().fireWall;
    },
    update,
    updateGameOver,
    get dimension() {
      return currentDimension;
    },
    get score() {
      return getActiveLayer().speedState.score;
    },
    get difficulty() {
      return getActiveLayer().speedState.difficulty;
    },
    get cameraX() {
      return player.cameraX ?? 0;
    },
    get cameraY() {
      return player.cameraY ?? 0;
    },
    get boosters() {
      return getActiveLayer().boosters;
    }
  };
}
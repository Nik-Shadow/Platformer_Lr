import { createPlayerControllerImpl } from "./playerControllerImpl.js";

export function createPlayerController(player, getPlatforms, getSpeedState) {
  return createPlayerControllerImpl(player, getPlatforms, getSpeedState);
}


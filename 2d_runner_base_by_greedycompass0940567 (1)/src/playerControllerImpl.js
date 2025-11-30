import { createPlayerControllerImpl as createPlayerControllerImplInternal } from "./player/controllerCore.js";

export function createPlayerControllerImpl(player, getPlatforms, getSpeedState) {
  return createPlayerControllerImplInternal(player, getPlatforms, getSpeedState);
}


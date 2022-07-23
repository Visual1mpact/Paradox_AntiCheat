/**
 * Imported from https://github.com/notbeer/Gametest-API-Wrapper/blob/main/src/library/utils/scheduling.ts
 */
import { world } from "mojang-minecraft";
import getStack from "../debug/stack.js";

const World = world;

const tickTimeoutMap = new Map();
const tickIntervalMap = new Map();
let tickTimeoutID = 0,
  tickIntervalID = 0;

/**
 * Delay executing a function
 * @typedef
 * @param {string | Function} handler Function you want to execute
 * @param {number} [timeout] Time delay in ticks. 20 ticks is 1 second
 * @param {any[]} args Function parameters for your handler
 * @returns {number}
 */
function setTickTimeout(handler: any, timeout: number, ...args: any[]): number {
  const tickTimeout = { callback: handler, tick: timeout, args };
  tickTimeoutID++;
  tickTimeoutMap.set(tickTimeoutID, tickTimeout);
  console.log(
    `Set tick timeout for ${handler.name || "(anonymous)"} (${
      handler.fileName
    }:${handler.lineNumber}) (ID: ${tickTimeoutID}) \n${getStack()}`
  );
  return tickTimeoutID;
}
/**
 * Delay executing a function, REPEATEDLY
 * @typedef
 * @param {string | Function} handler Function you want to execute
 * @param {number} [timeout] Time delay in ticks. 20 ticks is 1 second
 * @param {any[]} args Function parameters for your handler
 * @returns {number}
 */
function setTickInterval(
  handler: any,
  timeout: number,
  ...args: any[]
): number {
  const tickInterval = { callback: handler, tick: timeout, args };
  tickIntervalID++;
  tickIntervalMap.set(tickIntervalID, tickInterval);
  console.log(
    `Set tick interval for ${handler.name || "(anonymous)"} (${
      handler.fileName
    }:${handler.lineNumber}) (ID: ${tickIntervalID}) \n${getStack()}`
  );
  return tickIntervalID;
}
/**
 * Delete a clearTickTimeout
 * @typedef
 * @param {number} handle Index you want to delete
 */
function clearTickTimeout(handle: number) {
  console.log(`Clear tick timeout with ID ${handle} \n${getStack()}`);
  if (!tickTimeoutMap.delete(handle))
    console.warn(
      `Failed to clear tick timeout with ID ${handle}: the ID doesn't exist`
    );
}
/**
 * Delete a clearTickInterval
 * @typedef
 * @param {number} handle Index you want to delete
 */
function clearTickInterval(handle: number) {
  console.log(`Clear tick interval with ID ${handle} \n${getStack()}`);
  if (!tickIntervalMap.delete(handle))
    console.warn(
      `Failed to clear tick interval with ID ${handle}: the ID doesn't exist`
    );
}

World.events.tick.subscribe((data) => {
  for (const [ID, tickTimeout] of tickTimeoutMap) {
    tickTimeout.tick--;
    if (tickTimeout.tick <= 0) {
      tickTimeout.callback(...tickTimeout.args);
      tickTimeoutMap.delete(ID);
    }
  }
  for (const [, tickInterval] of tickIntervalMap) {
    if (data.currentTick % tickInterval.tick === 0)
      tickInterval.callback(...tickInterval.args);
  }
});

export { setTickTimeout, setTickInterval, clearTickTimeout, clearTickInterval };

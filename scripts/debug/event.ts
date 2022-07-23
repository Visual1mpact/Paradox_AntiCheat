import { world } from "mojang-minecraft";
import getStack from "./stack.js";
import config from "../data/config.js";

if (config.debug) {
  for (const k in world.events) {
    const evSignal = world.events[k],
      OSubscribe = evSignal.subscribe.bind(evSignal);

    OSubscribe((evd) => {
      let logtext = `Event ${k} triggered`;
      console.log(logtext);
      for (const [fn, { stack }] of fnList) {
        const fsource = `${fn.fileName}:${fn.lineNumber}`;

        const t0 = Date.now();
        try {
          fn(evd);
        } catch (e) {
          console.warn(
            `world > events > ${k} (${
              fn.name || "(anonymous)"
            } (${fsource})): ${
              e instanceof Error ? `${e}\n${e.stack}\n${stack}` : e
            }`
          );
        }

        const t1 = Date.now();
        logtext += `\n    ${fn.name || "(anonymous)"} (${fsource}): ${
          t1 - t0
        }ms`;
      }
      console.log(logtext);
    });

    const fnList = new Map();

    evSignal.subscribe = (fn) => {
      if (!fn) return console.warn(`Event ${k} - 'fn' argument not passed`);
      console.log(
        `Event ${k} subscribe \n    ${fn.name || "(anonymous)"} (${
          fn.fileName
        }:${fn.lineNumber}) \n${getStack()}`
      );
      fnList.set(fn, { stack: getStack() });
    };
    evSignal.unsubscribe = (fn) => {
      if (!fn) return console.warn(`Event ${k} - 'fn' argument not passed`);
      console.log(
        `Event ${k} unsubscribe \n    ${fn.name || "(anonymous)"} (${
          fn.fileName
        }:${fn.lineNumber}) \n${getStack()}`
      );
      if (!fnList.delete(fn))
        console.warn(
          `Failed to unsubscribe ${fn.name || "(anonymous)"} (${fn.fileName}:${
            fn.lineNumber
          }) from event ${k}`
        );
    };
  }
}

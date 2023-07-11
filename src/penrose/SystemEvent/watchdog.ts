// @ts-ignore
import { WatchdogTerminateBeforeEvent, system } from "@minecraft/server";

function watchdog(terminator: WatchdogTerminateBeforeEvent) {
    // Cancel watchdog from shutting down server/realm
    terminator.cancel = true;
}

const WatchDog = () => {
    // Listen to watchdog
    // @ts-ignore
    system.beforeEvents.watchdogTerminate.subscribe(watchdog);
};

export { WatchDog };

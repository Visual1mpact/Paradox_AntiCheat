import { WatchdogTerminateBeforeEvent, system } from "@minecraft/server";

function watchdog(terminator: WatchdogTerminateBeforeEvent) {
    // Cancel watchdog from shutting down server/realm
    terminator.cancel = true;
}

const WatchDog = () => {
    // Listen to watchdog
    system.beforeEvents.watchdogTerminate.subscribe(watchdog);
};

export { WatchDog };

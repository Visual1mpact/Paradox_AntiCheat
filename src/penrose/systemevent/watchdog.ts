// @ts-ignore
import { system } from "mojang-minecraft";

function watchdog(terminator) {
    // Cancel watchdog from shutting down server/realm
    terminator.cancel = true;
}

const WatchDog = () => {
    // Listen to watchdog
    system.events.beforeWatchdogTerminate.subscribe(watchdog);
};

export { WatchDog };

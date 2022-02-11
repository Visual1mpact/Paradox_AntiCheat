import * as Minecraft from "mojang-minecraft";

const World = Minecraft.world;

const tickEventCallback = World.events.tick;

// This is to allow passing between functions
let player;
let isChecked = false;

// This function will be called when tick event is triggered from the playerloaded function
function time() {
    try {
        // We loop testfor until it returns true so we know the
        // player is in the world because playerJoin triggers
        // too quickly while player is in loading screen
        player.runCommand(`testfor @a[name="${player.name}"]`);
        try {
            // (1..) gametest already enabled so set loaded to true and do nothing
            player.runCommand(`testfor @a[scores={gametestapi=1..}]`);
            isChecked = true;
            tickEventCallback.unsubscribe(time)
        } catch {
            // (..0) gametest needs to be enabled (1..) then set loaded to true
            player.runCommand(`testfor @a[scores={gametestapi=..0}]`);
            player.runCommand(`execute "${player.name}" ~~~ function checks/gametestapi`);
            isChecked = true;
            // We unsubscribe to the tick event from the time function
            tickEventCallback.unsubscribe(time)
            // I do not think this is needed since we unsubscribed
            // but it's here for now until I feel like verifying
            return;
        }

    } catch (error) {}
}

// This function will be called when playerJoin event is triggered
function GametestCheck(loaded) {
    if (isChecked === false) {
        // Get the name of the player who is joining
        player = loaded.player;
        // Subscribe tick event to the time function
        tickEventCallback.subscribe(time)
    }
}

export { GametestCheck }
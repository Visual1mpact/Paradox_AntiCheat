import { config, dynamicPropertyRegistry, EntityQueryOptions, system, world } from "../../../index";

async function hotbar(id: number) {
    // Get Dynamic Property
    const hotbarBoolean = dynamicPropertyRegistry.get("hotbar_b");

    // Unsubscribe if disabled in-game
    if (hotbarBoolean === false) {
        system.clearRun(id);
        return;
    }
    let hotbarMessage: string;
    const filter = new Object() as EntityQueryOptions;
    filter.excludeTags = ["vanish"];
    // run as each player
    for (const player of world.getPlayers(filter)) {
        hotbarMessage = config.modules.hotbar.message;
        await player.runCommandAsync(`titleraw @s actionbar {"rawtext":[{"text":${JSON.stringify(hotbarMessage)}}]}`);
    }
}

/**
 * We store the identifier in a variable
 * to cancel the execution of this scheduled run
 * if needed to do so.
 */
export function Hotbar() {
    const hotbarId = system.runInterval(() => {
        hotbar(hotbarId);
    });
}

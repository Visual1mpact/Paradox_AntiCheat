import { config, dynamicPropertyRegistry, flag, system, world } from "../../../index";

function namespoofa(id: number) {
    // Get Dynamic Property
    const nameSpoofBoolean = dynamicPropertyRegistry.get("namespoofa_b");

    // Unsubscribe if disabled in-game
    if (nameSpoofBoolean === false) {
        system.clearRun(id);
        return;
    }
    // run as each player
    for (const player of world.getPlayers()) {
        // Get unique ID
        const uniqueId = dynamicPropertyRegistry.get(player?.scoreboard?.id);

        // Skip if they have permission
        if (uniqueId === player.name) {
            continue;
        }
        // Namespoof/A = username length check.
        try {
            if (player.name.length < config.modules.namespoofA.minNameLength || player.name.length > config.modules.namespoofA.maxNameLength) {
                flag(player, "Namespoof", "A", "Exploit", null, null, "nameLength", String(player.name.length), false, null);
            }
        } catch (error) {}
    }
    return;
}

/**
 * We store the identifier in a variable
 * to cancel the execution of this scheduled run
 * if needed to do so.
 */
export function NamespoofA() {
    const nameSpoofAId = system.runInterval(() => {
        namespoofa(nameSpoofAId);
    }, 40);
}

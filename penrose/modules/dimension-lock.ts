import { world, PlayerDimensionChangeAfterEvent } from "@minecraft/server";
import { EventCoordinator } from "../classes/event-coordinator";
import { paradoxModulesDB } from "../event-listeners/world-initialize";

/** Reference to the dimension change event subscription */
let dimensionChangeSub: ((event: PlayerDimensionChangeAfterEvent) => void) | undefined;

/**
 * Monitors dimension changes to prevent access to locked dimensions.
 */
async function handleDimensionChange(event: PlayerDimensionChangeAfterEvent) {
    const moduleData = (await paradoxModulesDB.get("dimensionLock_b")) ?? null;
    if (!moduleData?.enabled || !moduleData.settings) return;

    const { player, toDimension, fromDimension } = event;
    const settings = moduleData.settings;

    let targetLocked = false;
    if (toDimension.id === "minecraft:nether" && settings.nether) targetLocked = true;
    if (toDimension.id === "minecraft:the_end" && settings.theEnd) targetLocked = true;

    if (targetLocked) {
        // Exempt Level 4 administrators from the lock
        const clearance = (player.getDynamicProperty("securityClearance") as number) ?? 1;
        if (clearance >= 4) return;

        // Teleport them back to the spawn location of the dimension they originated from
        const spawn = world.getDefaultSpawnLocation();
        player.teleport(spawn, { dimension: fromDimension });

        const dimName = toDimension.id.split(":")[1].replace("_", " ");
        player.sendMessage(`§2[§7Paradox§2]§o§7 Access to the §e${dimName}§7 dimension is currently §clocked§7.`);
    }
}

/**
 * Starts the Dimension Lock monitoring.
 */
export function startDimensionLock(): void {
    if (dimensionChangeSub) return;
    dimensionChangeSub = handleDimensionChange;
    EventCoordinator.subscribeAfter("playerDimensionChange", dimensionChangeSub);
}

/**
 * Stops the Dimension Lock monitoring.
 */
export function stopDimensionLock(): void {
    if (!dimensionChangeSub) return;
    EventCoordinator.unsubscribeAfter("playerDimensionChange", dimensionChangeSub);
    dimensionChangeSub = undefined;
}

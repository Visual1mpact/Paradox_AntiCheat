import { world, Player, PlayerDimensionChangeAfterEvent } from "@minecraft/server";
import { EventCoordinator } from "../classes/core/event-coordinator";
import { paradoxModulesDB } from "../event-listeners/world-initialize";
import { SecurityClearanceManager } from "../classes/cache/level-four-security-tracker";
import { FlagManager } from "../classes/logging/flag-manager";

/** Reference to the dimension change event subscription */
let dimensionChangeSub: ((event: PlayerDimensionChangeAfterEvent) => void) | undefined;

/**
 * Distributes an in-game alert notification to all active staff players
 * possessing Security Clearance Level 4 when a player attempts to enter a locked dimension.
 *
 * @param {Player} player - The player attempting to enter the locked dimension.
 * @param {string} dimName - The formatted name of the locked dimension.
 */
function alertStaff(player: Player, dimName: string): void {
    const staff = SecurityClearanceManager.getSecurityClearanceLevel4Players();
    FlagManager.logFlag(player, "DimensionLock", `Player attempted to enter locked dimension: ${dimName}.`);
    for (const s of staff) {
        if (!s.isValid || s.id === player.id) continue;
        s.sendMessage(`§2[§7Paradox§2]§o§7 §e[DimensionLock] §f${player.name} §7attempted to enter locked dimension: §e${dimName}§7.`);
    }
}

/**
 * Monitors dimension changes to prevent access to locked dimensions.
 *
 * @param {PlayerDimensionChangeAfterEvent} event - The dimension change event payload.
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

        // Try player bed/anchor spawn, fallback to world spawn for that dimension
        const playerSpawn = player.getSpawnPoint();
        const worldSpawn = world.getDefaultSpawnLocation();

        const targetLocation = playerSpawn ?? worldSpawn;
        const targetDimension = playerSpawn?.dimension ?? fromDimension;

        // Teleport player back to their personal spawn or the dimension's default spawn
        player.teleport({ x: targetLocation.x, y: targetLocation.y, z: targetLocation.z }, { dimension: targetDimension });

        const dimName = (toDimension.id.split(":")[1] ?? toDimension.id).replace("_", " ");
        player.sendMessage(`§2[§7Paradox§2]§o§7 Access to the §e${dimName}§7 dimension is currently §clocked§7.`);

        // Notify staff of the violation attempt
        alertStaff(player, dimName);
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

import { world, Player, PlayerDimensionChangeAfterEvent } from "@minecraft/server";
import { EventCoordinator } from "../classes/core/event-coordinator";
import { SecurityClearanceManager } from "../classes/cache/level-four-security-tracker";
import { FlagManager } from "../classes/logging/flag-manager";

/**
 * Settings interface defining locked dimensions.
 */
export interface DimensionLockSettings {
    nether: boolean;
    theEnd: boolean;
}

/** Active configuration settings for dimension locking */
let lockSettings: DimensionLockSettings = { nether: false, theEnd: false };

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
    FlagManager.logFlag(player, "DimensionLock", `Player attempted to enter locked dimension: ${dimName}.`);
    const staff = SecurityClearanceManager.getSecurityClearanceLevel4Players();

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
function handleDimensionChange(event: PlayerDimensionChangeAfterEvent): void {
    const { player, toDimension, fromDimension } = event;

    const targetLocked = (toDimension.id === "minecraft:nether" && lockSettings.nether) || (toDimension.id === "minecraft:the_end" && lockSettings.theEnd);

    if (!targetLocked) return;

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

/**
 * Starts the Dimension Lock monitoring.
 *
 * @param {DimensionLockSettings} [settings] - Configuration options for dimension restrictions.
 */
export function startDimensionLock(settings?: DimensionLockSettings): void {
    if (settings) {
        lockSettings = settings;
    }

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

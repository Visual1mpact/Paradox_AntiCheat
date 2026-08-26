import { system, Block, PlayerLeaveBeforeEvent, PlayerPlaceBlockBeforeEvent, Vector3, GameMode, Player } from "@minecraft/server";
import { EventCoordinator } from "../classes/core/event-coordinator";
import { PlayerLocationCache } from "../classes/cache/player-location-cache";
import { SecurityClearanceManager } from "../classes/cache/level-four-security-tracker";
import { FlagManager } from "../classes/logging/flag-manager";

// Configuration Constants
const SCAFFOLD_THRESHOLD = 3; // Number of blocks placed in quick succession
const TIME_WINDOW = 20; // Time window in ticks (20 ticks = 1 second)
const EXCLUDED_BLOCKS = ["minecraft:scaffolding"]; // Excluded blocks like scaffolding

// Data structure to keep track of block placements
const playerBlockPlacements: Map<string, { positions: Block[]; times: number[] }> = new Map();

/** Tracks the last tick a scaffold alert was sent per player to prevent spam */
const alertCooldowns = new Map<string, number>();
const ALERT_COOLDOWN_TICKS = 100; // 5 seconds cooldown between staff alerts per player

// Variables to store the subscription references
let blockPlacementCallback: ((arg: PlayerPlaceBlockBeforeEvent) => void) | undefined;
let playerLeaveCallback: ((arg: PlayerLeaveBeforeEvent) => void) | undefined;

/**
 * Distributes an in-game alert notification to active staff players when
 * a player is detected using scaffold hacks.
 *
 * @param {Player} player - The player detected using scaffold hacks.
 */
function alertStaff(player: Player): void {
    const currentTick = system.currentTick;
    const lastAlert = alertCooldowns.get(player.id) ?? 0;

    // Prevent spam by checking if the cooldown interval has passed
    if (currentTick - lastAlert < ALERT_COOLDOWN_TICKS) return;

    alertCooldowns.set(player.id, currentTick);

    const staff = SecurityClearanceManager.getSecurityClearanceLevel4Players();
    FlagManager.logFlag(player, "Scaffold", "Player flagged for potential scaffold hack.");
    for (const s of staff) {
        if (!s.isValid || s.id === player.id) continue;
        s.sendMessage(`§2[§7Paradox§2]§o§7 §e[Scaffold] §f${player.name} §7was detected using Scaffold.`);
    }
}

/**
 * Unsubscribes from the scaffold detection events.
 */
export function stopScaffoldCheck() {
    if (blockPlacementCallback) {
        EventCoordinator.unsubscribeBefore("playerPlaceBlock", blockPlacementCallback);
        blockPlacementCallback = undefined;
    }
    if (playerLeaveCallback) {
        EventCoordinator.unsubscribeBefore("playerLeave", playerLeaveCallback);
        playerLeaveCallback = undefined;
    }
    playerBlockPlacements.clear();
    alertCooldowns.clear();
}

/**
 * Detects if the player is using scaffolding hacks and returns the positions of suspicious blocks.
 *
 * @param {string} playerId - The ID of the player.
 * @returns {Vector3[]} - An array of block positions that are considered suspicious.
 */
function detectScaffolding(playerId: string): Vector3[] {
    const data = playerBlockPlacements.get(playerId);
    if (!data || data.positions.length < SCAFFOLD_THRESHOLD) return [];

    // Check if blocks were placed within the TIME_WINDOW
    const times = data.times;
    const timeCount = times.length;
    const recentTimes = times[timeCount - 1]! - times[timeCount - SCAFFOLD_THRESHOLD]!;
    if (recentTimes > TIME_WINDOW) return [];

    // Check if exactly two out of three coordinates are constant
    const positions = data.positions.slice(-SCAFFOLD_THRESHOLD);
    const base = positions[0]!.location;
    let xMatch = 1,
        yMatch = 1,
        zMatch = 1;

    for (let i = 1; i < positions.length; i++) {
        const loc = positions[i]!.location;
        if (loc.x !== base.x) xMatch = 0;
        if (loc.y !== base.y) yMatch = 0;
        if (loc.z !== base.z) zMatch = 0;
    }

    // At least two axes must match
    if (xMatch + yMatch + zMatch >= 2) {
        return positions.map((block) => block.location);
    }

    return [];
}

/**
 * Initializes the scaffold detection logic by subscribing to relevant events.
 * This function sets up event listeners to detect potential scaffold hacks by players.
 */
export function startScaffoldCheck() {
    // Initialize location cache tracking
    PlayerLocationCache.init();

    blockPlacementCallback = (event: PlayerPlaceBlockBeforeEvent) => {
        const player = event.player;
        const block = event.block;
        const blockPermutation = event.permutationToPlace;
        const gamemode = player.getGameMode();
        const playerId = player.id;

        // Skip spectators, creative mode, sneaking, or excluded blocks
        if (gamemode === GameMode.Spectator || gamemode === GameMode.Creative || player.isSneaking || (block && EXCLUDED_BLOCKS.includes(blockPermutation.type.id))) {
            return;
        }

        // Check the block below for solidity
        const belowBlock = block.below();
        // Skip farmland when planting crops like potatoes, carrots, etc.
        if (belowBlock?.typeId === "minecraft:farmland") {
            return;
        }
        if (belowBlock?.isSolid && !EXCLUDED_BLOCKS.includes(belowBlock.typeId)) {
            return;
        }

        // Initialize tracking for the player if not already set
        let data = playerBlockPlacements.get(playerId);
        if (!data) {
            data = { positions: [], times: [] };
            playerBlockPlacements.set(playerId, data);
        }

        // Add block placement to the data
        data.positions.push(block);
        data.times.push(system.currentTick);

        // Limit buffer size to avoid excessive memory usage
        if (data.positions.length > SCAFFOLD_THRESHOLD * 2) {
            data.positions.shift();
            data.times.shift();
        }

        // Detect potential scaffolding and handle suspicious blocks
        const suspiciousBlocks = detectScaffolding(playerId);
        if (suspiciousBlocks.length > 0) {
            alertStaff(player);

            system.run(() => {
                // Retrieve player dimension via cache fallback
                const transform = PlayerLocationCache.getTransform(player);
                const dimension = transform?.dimension ?? player.dimension;

                // Handle block replacement and inventory
                const inventory = player.getComponent("inventory");
                if (inventory && inventory.container) {
                    const blockItemStack = block?.getItemStack(1, true);
                    if (blockItemStack) {
                        inventory.container.addItem(blockItemStack);
                    }
                }
                suspiciousBlocks.forEach((pos) => {
                    const suspiciousBlock = dimension.getBlock(pos);
                    if (suspiciousBlock) suspiciousBlock.setType("minecraft:air");
                });
            });
        }
    };

    // Clean up when a player leaves
    playerLeaveCallback = (event: PlayerLeaveBeforeEvent) => {
        playerBlockPlacements.delete(event.player.id);
        alertCooldowns.delete(event.player.id);
    };

    // Subscribe to events
    EventCoordinator.subscribeBefore("playerPlaceBlock", blockPlacementCallback);
    EventCoordinator.subscribeBefore("playerLeave", playerLeaveCallback);
}

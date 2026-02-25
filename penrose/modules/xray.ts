import { world, system, PlayerBreakBlockAfterEvent, PlayerLeaveAfterEvent, Block } from "@minecraft/server";
import { getSecurityClearanceLevel4Players } from "../utility/level-4-security-tracker";

/* ============================================================
   CONFIGURATION
============================================================ */

// All ores we track
const TRACKED_ORES = new Set([
    "minecraft:iron_ore",
    "minecraft:deepslate_iron_ore",
    "minecraft:gold_ore",
    "minecraft:deepslate_gold_ore",
    "minecraft:lapis_ore",
    "minecraft:deepslate_lapis_ore",
    "minecraft:redstone_ore",
    "minecraft:deepslate_redstone_ore",
    "minecraft:diamond_ore",
    "minecraft:deepslate_diamond_ore",
    "minecraft:emerald_ore",
    "minecraft:deepslate_emerald_ore",
    "minecraft:ancient_debris",
]);

// Suspicion weight per ore (rarer ores = higher weight)
const ORE_SUSPICION_WEIGHT: Record<string, number> = {
    "minecraft:iron_ore": 1,
    "minecraft:deepslate_iron_ore": 1,
    "minecraft:gold_ore": 2,
    "minecraft:deepslate_gold_ore": 2,
    "minecraft:lapis_ore": 1,
    "minecraft:deepslate_lapis_ore": 1,
    "minecraft:redstone_ore": 1,
    "minecraft:deepslate_redstone_ore": 1,
    "minecraft:diamond_ore": 5,
    "minecraft:deepslate_diamond_ore": 5,
    "minecraft:emerald_ore": 5,
    "minecraft:deepslate_emerald_ore": 5,
    "minecraft:ancient_debris": 8,
};

const WINDOW_TICKS = 2400; // 2 minutes
const DECAY_INTERVAL = 600; // 30 seconds
const DECAY_AMOUNT = 3;

/* Escalation thresholds */
const ALERT_SCORE = 15;
const PRIORITY_SCORE = 25;
const FREEZE_SCORE = 40;

/* ============================================================
   DATA MODEL
============================================================ */

interface MiningProfile {
    suspicion: number;
    lastDecayTick: number;

    totalBlocks: number;
    rareBlocks: number;

    windowStart: number;
    windowBlocks: number;
    windowRare: number;

    lastOreLocation?: { x: number; y: number; z: number };
    lastOreTick?: number;
    veinChain: number;
}

const profiles = new Map<string, MiningProfile>();

/* ============================================================
   UTILITY
============================================================ */

/**
 * Retrieves the mining profile for a player, initializing it if needed.
 */
function getProfile(playerId: string): MiningProfile {
    let profile = profiles.get(playerId);
    if (!profile) {
        profile = {
            suspicion: 0,
            lastDecayTick: system.currentTick,

            totalBlocks: 0,
            rareBlocks: 0,

            windowStart: system.currentTick,
            windowBlocks: 0,
            windowRare: 0,

            veinChain: 0,
        };
        profiles.set(playerId, profile);
    }
    return profile;
}

/**
 * Gradually reduces a player's suspicion over time to prevent stale alerts.
 */
function decaySuspicion(profile: MiningProfile) {
    const now = system.currentTick;
    if (now - profile.lastDecayTick >= DECAY_INTERVAL) {
        profile.suspicion = Math.max(0, profile.suspicion - DECAY_AMOUNT);
        profile.lastDecayTick = now;
    }
}

/**
 * Adds suspicion points to a player and triggers escalation if thresholds are met.
 */
function addSuspicion(playerId: string, profile: MiningProfile, amount: number, reason: string) {
    profile.suspicion += amount;

    if (profile.suspicion >= FREEZE_SCORE) {
        freezePlayer(playerId, profile, reason);
    } else if (profile.suspicion >= PRIORITY_SCORE) {
        alertStaff(playerId, profile, "§6[Priority]");
    } else if (profile.suspicion >= ALERT_SCORE) {
        alertStaff(playerId, profile, "§e[Alert]");
    }
}

/* ============================================================
   DETECTION SIGNALS
============================================================ */

/**
 * Determines if a mined ore is "hidden," i.e., fully surrounded by blocks, which increases suspicion.
 */
function isHiddenOre(block: Block): boolean {
    const neighbors = [block.north(), block.south(), block.east(), block.west(), block.above(), block.below()];

    for (const n of neighbors) {
        if (!n) continue;
        if (n.typeId === "minecraft:air" || n.typeId === "minecraft:cave_air") {
            return false;
        }
    }
    return true;
}

/**
 * Evaluates the ratio of rare ores mined in the current window and escalates suspicion if high.
 */
function checkOreRatio(profile: MiningProfile, playerId: string, blockId: string) {
    const now = system.currentTick;

    if (now - profile.windowStart > WINDOW_TICKS) {
        profile.windowStart = now;
        profile.windowBlocks = 0;
        profile.windowRare = 0;
        return;
    }

    if (profile.windowBlocks < 20) return;

    // Weighted ratio based on ore rarity
    const ratio = profile.windowRare / profile.windowBlocks;

    const weight = ORE_SUSPICION_WEIGHT[blockId] ?? 1;
    const thresholdHigh = weight >= 5 ? 0.08 : 0.15; // rarer ores trigger sooner
    const thresholdMedium = weight >= 5 ? 0.05 : 0.08;

    if (ratio > thresholdHigh) {
        addSuspicion(playerId, profile, weight + 2, `High ore ratio (${blockId})`);
    } else if (ratio > thresholdMedium) {
        addSuspicion(playerId, profile, weight, `Elevated ore ratio (${blockId})`);
    }
}

/**
 * Checks for vein-jumping behavior by measuring distance between consecutive ore blocks.
 * Rarer ores flag shorter distances to increase sensitivity.
 */
function checkVeinJump(profile: MiningProfile, playerId: string, location: { x: number; y: number; z: number }, blockId: string) {
    if (!profile.lastOreLocation) {
        profile.lastOreLocation = location;
        profile.veinChain = 0;
        return;
    }

    const dx = location.x - profile.lastOreLocation.x;
    const dy = location.y - profile.lastOreLocation.y;
    const dz = location.z - profile.lastOreLocation.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const weight = ORE_SUSPICION_WEIGHT[blockId] ?? 1;
    const veinJumpThreshold = weight >= 5 ? 10 : 15; // rarer ores flag closer distances

    if (distance > veinJumpThreshold) {
        profile.veinChain++;
        if (profile.veinChain >= 3) {
            addSuspicion(playerId, profile, weight + 3, `Vein jumping behavior (${blockId})`);
            profile.veinChain = 0;
        }
    } else {
        profile.veinChain = 0;
    }

    profile.lastOreLocation = location;
}

/* ============================================================
   ESCALATION
============================================================ */

/**
 * Notifies staff of a player’s suspicion level.
 */
function alertStaff(playerId: string, profile: MiningProfile, level: string) {
    const player = world.getAllPlayers().find((p) => p.id === playerId);
    if (!player) return;

    const staff = getSecurityClearanceLevel4Players();
    for (const s of staff) {
        if (s.id === player.id) continue;
        s.sendMessage(`§2[§7Paradox§2]§o§7 ${level} §f${player.name} §7Suspicion: §c${profile.suspicion}`);
    }
}

/**
 * Applies freeze effects to a player and alerts staff.
 */
function freezePlayer(playerId: string, profile: MiningProfile, reason: string) {
    const player = world.getAllPlayers().find((p) => p.id === playerId);
    if (!player) return;

    const duration = 100; // 5 seconds
    player.addEffect("minecraft:slowness", duration, { amplifier: 255, showParticles: false });
    player.addEffect("minecraft:mining_fatigue", duration, { amplifier: 255, showParticles: false });

    alertStaff(playerId, profile, `§4[FREEZE] §7Reason: §f${reason}`);
}

/* ============================================================
   EVENT HANDLERS
============================================================ */

/**
 * Handles a block break event: updates mining profile, evaluates ore ratios,
 * vein-jumping behavior, and triggers suspicion escalation if necessary.
 */
function handleBlockBreak(event: PlayerBreakBlockAfterEvent) {
    const { player, brokenBlockPermutation, block } = event;
    const playerId = player.id;
    const blockId = brokenBlockPermutation.type.id;

    if (!TRACKED_ORES.has(blockId)) return;

    const profile = getProfile(playerId);
    decaySuspicion(profile);

    profile.totalBlocks++;
    profile.windowBlocks++;

    const weight = ORE_SUSPICION_WEIGHT[blockId] ?? 1;
    profile.rareBlocks += weight;
    profile.windowRare += weight;

    if (isHiddenOre(block) && weight >= 3) {
        addSuspicion(playerId, profile, weight + 2, `Hidden ore mined (${blockId})`);
    }

    checkOreRatio(profile, playerId, blockId);
    checkVeinJump(profile, playerId, player.location, blockId);

    if (blockId === "minecraft:ancient_debris") {
        if (profile.lastOreTick && system.currentTick - profile.lastOreTick < 900) {
            addSuspicion(playerId, profile, weight + 3, "Ancient debris burst");
        }
    }

    profile.lastOreTick = system.currentTick;
}

/**
 * Cleans up the player's profile when they leave the game.
 */
function onLeave(event: PlayerLeaveAfterEvent) {
    profiles.delete(event.playerId);
}

/* ============================================================
   START / STOP
============================================================ */

/**
 * Subscribes to block break and player leave events to start Xray detection.
 */
export function startXrayDetection() {
    world.afterEvents.playerBreakBlock.subscribe(handleBlockBreak);
    world.afterEvents.playerLeave.subscribe(onLeave);
}

/**
 * Unsubscribes from events and clears profiles to stop Xray detection.
 */
export function stopXrayDetection() {
    world.afterEvents.playerBreakBlock.unsubscribe(handleBlockBreak);
    world.afterEvents.playerLeave.unsubscribe(onLeave);
    profiles.clear();
}

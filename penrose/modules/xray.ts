import { world, system, PlayerBreakBlockAfterEvent, PlayerLeaveAfterEvent, Block, ChatSendBeforeEvent } from "@minecraft/server";
import { getSecurityClearanceLevel4Players } from "../utility/level-4-security-tracker";
import { PlayerCache } from "../classes/player-cache";

/* ============================================================
   CONFIGURATION
============================================================ */

// All ores we track for suspicious mining behavior
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

// Suspicion weight per ore type (rarer ores contribute more suspicion)
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

// Time window for calculating ore ratios (in ticks)
const WINDOW_TICKS = 2400; // 2 minutes

// Suspicion decay configuration
const DECAY_INTERVAL = 600; // 30 seconds
const DECAY_AMOUNT = 3; // amount of suspicion to reduce per interval

/* Escalation thresholds for alerting or freezing */
const ALERT_SCORE = 15; // low-level alert
const PRIORITY_SCORE = 25; // higher-priority alert
const FREEZE_SCORE = 40; // freeze player

/* Safe Zone cooldowns (prevents spamming) */
const SAFE_ZONE_COOLDOWN = 6000; // 5 minutes (in ticks)
const safeZoneCooldowns = new Map<string, number>(); // last creation tick per player

// Safe Zone tracking (includes expiration)
const safeZones = new Map<string, { x: number; y: number; z: number; expires: number }>();
const awaitingSafeZoneResponse = new Map<string, { x: number; y: number; z: number }>();

/* ============================================================
   DATA MODEL
============================================================ */

interface MiningProfile {
    suspicion: number; // current suspicion score
    lastDecayTick: number; // last tick when suspicion decayed
    totalBlocks: number; // total blocks mined
    rareBlocks: number; // total rare blocks mined
    windowStart: number; // start of current time window
    windowBlocks: number; // number of blocks mined in window
    windowRareCount: number; // rare blocks in current window
    lastOreLocation?: { x: number; y: number; z: number }; // last mined ore location
    lastOreTick?: number; // tick of last mined ore
    veinChain: number; // consecutive vein-jump count
}

// Player mining profiles
const profiles = new Map<string, MiningProfile>();

/* ============================================================
   UTILITY
============================================================ */

/**
 * Retrieves or initializes a mining profile for a player.
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
            windowRareCount: 0,
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
    const elapsed = now - profile.lastDecayTick;
    if (elapsed >= DECAY_INTERVAL) {
        const intervals = Math.floor(elapsed / DECAY_INTERVAL);
        profile.suspicion = Math.max(0, profile.suspicion - intervals * DECAY_AMOUNT);
        profile.lastDecayTick += intervals * DECAY_INTERVAL;
    }
}

/**
 * Adds suspicion points to a player and triggers escalation based on thresholds.
 */
function addSuspicion(playerId: string, profile: MiningProfile, amount: number, reason: string) {
    profile.suspicion += amount;

    if (profile.suspicion >= FREEZE_SCORE) {
        freezePlayer(playerId, profile, reason);
    } else if (profile.suspicion >= PRIORITY_SCORE) {
        alertStaff(playerId, profile, "§6[Priority]");
        promptSafeZone(playerId, getPlayerLocation(playerId));
    } else if (profile.suspicion >= ALERT_SCORE) {
        alertStaff(playerId, profile, "§e[Alert]");
        promptSafeZone(playerId, getPlayerLocation(playerId));
    }
}

/* ============================================================
   DETECTION SIGNALS
============================================================ */

/**
 * Determines if a mined ore is "hidden" (surrounded by solid blocks).
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
 * Evaluates the ratio of rare ores mined in the current window.
 * Adds suspicion if mining pattern is unusually dense with rare ores.
 */
function checkOreRatio(profile: MiningProfile, playerId: string, blockId: string) {
    const now = system.currentTick;

    // Reset window if expired
    if (now - profile.windowStart > WINDOW_TICKS) {
        profile.windowStart = now;
        profile.windowBlocks = 0;
        profile.windowRareCount = 0;
        return;
    }

    if (profile.windowBlocks < 20) return; // wait until sufficient data

    const ratio = profile.windowRareCount / profile.windowBlocks;
    const weight = ORE_SUSPICION_WEIGHT[blockId] ?? 1;
    const thresholdHigh = weight >= 5 ? 0.08 : 0.15;
    const thresholdMedium = weight >= 5 ? 0.05 : 0.08;

    if (ratio > thresholdHigh) {
        addSuspicion(playerId, profile, weight + 2, `High ore ratio (${blockId})`);
    } else if (ratio > thresholdMedium) {
        addSuspicion(playerId, profile, weight, `Elevated ore ratio (${blockId})`);
    }
}

/**
 * Checks for vein-jumping behavior (mining ores too far apart consecutively).
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
    const veinJumpThreshold = weight >= 5 ? 10 : 15;

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
 * Sends alert messages to security staff.
 */
function alertStaff(playerId: string, profile: MiningProfile, level: string) {
    const player = PlayerCache.getPlayerById(playerId);
    const staff = getSecurityClearanceLevel4Players();
    for (const s of staff) {
        if (player && s.id === player.id) continue;
        s.sendMessage(`§2[§7Paradox§2]§o§7 ${level} §f${player?.name ?? playerId} §7Suspicion: §c${profile.suspicion}`);
    }
}

/**
 * Freezes the player by applying extreme slowness and mining fatigue effects.
 */
function freezePlayer(playerId: string, profile: MiningProfile, reason: string) {
    const player = PlayerCache.getPlayerById(playerId);
    if (!player) return;

    const duration = 100;
    player.addEffect("minecraft:slowness", duration, {
        amplifier: 255,
        showParticles: false,
    });
    player.addEffect("minecraft:mining_fatigue", duration, {
        amplifier: 255,
        showParticles: false,
    });

    alertStaff(playerId, profile, `§4[FREEZE] §7Reason: §f${reason}`);
}

/* ============================================================
   SAFE ZONE LOGIC
============================================================ */

/**
 * Gets current player location.
 */
function getPlayerLocation(playerId: string) {
    const player = PlayerCache.getPlayerById(playerId);
    return player ? { x: player.location.x, y: player.location.y, z: player.location.z } : { x: 0, y: 0, z: 0 };
}

/**
 * Checks whether a player can create a Safe Zone (based on cooldown).
 */
function canCreateSafeZone(playerId: string): boolean {
    const lastTime = safeZoneCooldowns.get(playerId) ?? 0;
    return system.currentTick - lastTime >= SAFE_ZONE_COOLDOWN;
}

/**
 * Prompts player to create a Safe Zone to avoid suspicion in a specific area.
 */
function promptSafeZone(playerId: string, location: { x: number; y: number; z: number }) {
    if (!canCreateSafeZone(playerId)) return;
    if (awaitingSafeZoneResponse.has(playerId)) return;

    const player = PlayerCache.getPlayerById(playerId);
    if (!player) return;

    player.sendMessage(`§2[§7Paradox§2]§o§7 §eYour mining activity is raising suspicion! §aYou can mark your current location as a Safe Zone for breaking ores.` + ` §a§oType "Yes" to create the Safe Zone`);

    awaitingSafeZoneResponse.set(playerId, location);
}

/**
 * Creates a Safe Zone at the specified location for a player.
 */
function createSafeZone(playerId: string, location: { x: number; y: number; z: number }) {
    const expires = system.currentTick + SAFE_ZONE_COOLDOWN;
    safeZones.set(playerId, {
        ...location,
        expires,
    });
    safeZoneCooldowns.set(playerId, system.currentTick);

    const player = PlayerCache.getPlayerById(playerId);
    player?.sendMessage("§2[§7Paradox§2]§o§7 §aSafe Zone created [§720 x 20 x 20§a]! You may safely break ores here without triggering alerts for the next 5 minutes.");
}

/* ============================================================
   EVENT HANDLERS
============================================================ */

/**
 * Handles block break events to detect suspicious mining behavior.
 */
function handleBlockBreak(event: PlayerBreakBlockAfterEvent) {
    const { player, brokenBlockPermutation, block } = event;
    const playerId = player.id;
    const blockId = brokenBlockPermutation.type.id;
    const profile = getProfile(playerId);

    decaySuspicion(profile);

    profile.totalBlocks++;
    profile.windowBlocks++;

    // Safe Zone check with expiration
    const safeZone = safeZones.get(playerId);
    if (safeZone) {
        if (system.currentTick > safeZone.expires) {
            safeZones.delete(playerId);
        } else {
            const dx = Math.abs(player.location.x - safeZone.x);
            const dy = Math.abs(player.location.y - safeZone.y);
            const dz = Math.abs(player.location.z - safeZone.z);
            if (dx <= 20 && dy <= 20 && dz <= 20) return; // inside safe zone, skip detection
        }
    }

    if (!TRACKED_ORES.has(blockId)) return;

    profile.rareBlocks++;
    profile.windowRareCount++;

    const weight = ORE_SUSPICION_WEIGHT[blockId] ?? 1;

    // Hidden ore detection
    if (isHiddenOre(block) && weight >= 3) {
        addSuspicion(playerId, profile, weight + 2, `Hidden ore mined (${blockId})`);
    }

    checkOreRatio(profile, playerId, blockId);
    checkVeinJump(profile, playerId, player.location, blockId);

    // Ancient debris burst detection
    if (blockId === "minecraft:ancient_debris") {
        if (profile.lastOreTick && system.currentTick - profile.lastOreTick < 900) {
            addSuspicion(playerId, profile, weight + 3, "Ancient debris burst");
        }
    }

    profile.lastOreTick = system.currentTick;
}

/**
 * Handles chat input for Safe Zone confirmation.
 */
function handleSafeZoneChat(event: ChatSendBeforeEvent) {
    const playerId = event.sender.id;
    if (!awaitingSafeZoneResponse.has(playerId)) return;

    const location = awaitingSafeZoneResponse.get(playerId)!;
    const message = event.message.toLowerCase();

    if (["yes", "y"].includes(message)) {
        event.cancel = true;
        createSafeZone(playerId, location);
    } else if (["no", "n"].includes(message)) {
        event.cancel = true;
        event.sender.sendMessage("§o§c[Paradox] Safe Zone creation canceled.");
    } else {
        event.cancel = true;
        event.sender.sendMessage('§o§c[Paradox] Type "Yes" to create a Safe Zone or "No" to cancel.');
    }

    awaitingSafeZoneResponse.delete(playerId);
}

/**
 * Cleans up player data when they leave the server.
 */
function onLeave(event: PlayerLeaveAfterEvent) {
    profiles.delete(event.playerId);
    safeZones.delete(event.playerId);
    safeZoneCooldowns.delete(event.playerId);
    awaitingSafeZoneResponse.delete(event.playerId);
}

/* ============================================================
   START / STOP
============================================================ */

/**
 * Starts X-ray detection system.
 */
export function startXrayDetection() {
    world.afterEvents.playerBreakBlock.subscribe(handleBlockBreak);
    world.afterEvents.playerLeave.subscribe(onLeave);
    world.beforeEvents.chatSend.subscribe(handleSafeZoneChat);
}

/**
 * Stops X-ray detection system and clears all data.
 */
export function stopXrayDetection() {
    world.afterEvents.playerBreakBlock.unsubscribe(handleBlockBreak);
    world.afterEvents.playerLeave.unsubscribe(onLeave);
    world.beforeEvents.chatSend.unsubscribe(handleSafeZoneChat);

    profiles.clear();
    safeZones.clear();
    safeZoneCooldowns.clear();
    awaitingSafeZoneResponse.clear();
}

import { Player, system, EntityHurtBeforeEvent, GameMode } from "@minecraft/server";
import { getSecurityClearanceLevel4Players } from "../utility/level-4-security-tracker";
import { PlayerCache } from "../classes/player-cache";
import { EventCoordinator } from "../classes/event-coordinator";

// CONFIGURATION CONSTANTS
const MAX_REACH = 4.5; // Maximum allowed block reach distance
const MAX_REACH_SQ = MAX_REACH * MAX_REACH; // Squared reach distance (saves performance by omitting Math.sqrt)
const HISTORY_SIZE = 6; // Number of past positions to track for lag compensation

interface Position {
    x: number;
    y: number;
    z: number;
}

interface PlayerHistory {
    positions: Position[];
}

/** Flag indicating whether the module is manually toggled on */
let isModuleActive = false;
/** Flag indicating whether the background generator worker is processing a frame */
let isJobActive = false;
/** Active subscription handle for the entityHurt event */
let hurtSubscription: ((event: EntityHurtBeforeEvent) => void) | undefined;

/**
 * ACTIVE POSITION CACHE
 * Tracks the most up-to-date recorded positions for players.
 * Updated incrementally per-player to ensure data stays relevant mid-tick.
 */
const cachedLocations = new Map<string, Position>();

/**
 * HISTORICAL POSITION CACHE
 * Stores an array of past positions per player. Used to evaluate historical positional matching
 * when network latency (ping) causes disparity between the attacker and victim coordinates.
 */
const playerHistory = new Map<string, PlayerHistory>();

/**
 * Calculates the squared distance between two 3D spatial points.
 * Omits calculating a square root to optimize script runtime performance.
 */
function distSq(ax: number, ay: number, az: number, bx: number, by: number, bz: number) {
    const dx = ax - bx;
    const dy = ay - by;
    const dz = az - bz;
    return dx * dx + dy * dy + dz * dz;
}

/**
 * Commits a player's latest positional update into their historical buffer array.
 * Overlaps identical stationary positions and evicts old data beyond HISTORY_SIZE.
 */
function updatePlayerHistory(playerId: string, loc: Position) {
    let data = playerHistory.get(playerId);
    if (!data) {
        data = { positions: [] };
        playerHistory.set(playerId, data);
    }

    const history = data.positions;

    // De-duplication: Do not push position updates if the player hasn't moved
    if (history.length > 0) {
        const last = history[history.length - 1];
        if (last.x === loc.x && last.y === loc.y && last.z === loc.z) return;
    }

    // Clone and push the position object into history tracking
    history.push({ ...loc });

    // Evict the oldest position snapshot to maintain a fixed sliding window buffer size
    if (history.length > HISTORY_SIZE) {
        history.shift();
    }
}

/**
 * Distributes an in-game alert notification to all active staff players
 * possessing Security Clearance Level 4 when a reach violation is verified.
 */
function alertStaff(attacker: Player, distSqValue: number) {
    const staff = getSecurityClearanceLevel4Players();
    const distance = Math.sqrt(distSqValue); // Calculated here ONLY when a violation occurs

    for (const s of staff) {
        const isStaffValid = s.isValid;
        if (!isStaffValid || s.id === attacker.id) continue;
        s.sendMessage(`§2[§7Paradox§2]§o§7 §e[Reach] §f${attacker.name} §7hit too far: §e${distance.toFixed(2)} blocks`);
    }
}

/**
 * HOOK: Triggered before an entity takes damage.
 * Validates hit distances using cached snapshots, live fallbacks, and historic matrix arrays.
 */
function onHitCached(event: EntityHurtBeforeEvent) {
    const attacker = event.damageSource.damagingEntity;
    const victim = event.hurtEntity;

    // Verify both participants are actual players, and ignore creative-mode players
    if (!(attacker instanceof Player) || !(victim instanceof Player)) return;
    if (attacker.getGameMode() === GameMode.Creative) return;

    /**
     * CRITICAL FALLBACK MECHANIC:
     * Attempts to read coordinates from the cache. If the generator has not yet cycled
     * a player this turn, it instantly falls back to pulling their live `.location` API values.
     * This eliminates massive "crazy number" distance artifacts (like 664.07).
     */
    const aLoc = cachedLocations.get(attacker.id) ?? attacker.location;
    const vLoc = cachedLocations.get(victim.id) ?? victim.location;

    // STEP 1: Evaluate current baseline distance
    const currentDistSq = distSq(aLoc.x, aLoc.y, aLoc.z, vLoc.x, vLoc.y, vLoc.z);
    if (currentDistSq <= MAX_REACH_SQ) return; // Hit is legal within standard thresholds. Exit check.

    // STEP 2: Lag Compensation Check
    // If the immediate check fails, cross-reference all historical position variations.
    const attackerData = playerHistory.get(attacker.id);
    const victimData = playerHistory.get(victim.id);

    if (attackerData && victimData) {
        // Nested loop cross-checks historical vectors to catch latency-delayed positions
        for (const aHist of attackerData.positions) {
            for (const vHist of victimData.positions) {
                if (distSq(aHist.x, aHist.y, aHist.z, vHist.x, vHist.y, vHist.z) <= MAX_REACH_SQ) {
                    return; // Found a valid timestamp matrix where this hit was within reach bounds. Exit check.
                }
            }
        }
    }

    const finalDistance = Math.sqrt(currentDistSq);

    /**
     * SAFETY ANOMALY FILTER:
     * Prevents false alerts/cancels stemming from rapid dimension changes,
     * ender-pearl teleports, or server-side structural position updates.
     */
    if (finalDistance > 30) return;

    // VIOLATION VERIFIED: Cancel damage event and alert moderation staff
    event.damage = 0;
    alertStaff(attacker, currentDistSq);
}

/**
 * Continuous generator loop that distributes player tracking coordinates across server ticks.
 * Seamlessly processes one player, yields to the game loop, and recursively restarts.
 */
function* continuousReachLoop(): Generator<void, void, unknown> {
    if (isJobActive) return;
    isJobActive = true;

    try {
        // Safe exit if the module was manually toggled off or database tracking disabled
        if (!isModuleActive) return;

        const players = PlayerCache.getPlayers();

        // Dynamic tracking: Track valid IDs currently on the server to flush disconnected data later
        const activePlayerIds = new Set<string>();

        for (const player of players) {
            const isValid = player.isValid;
            if (!isValid) continue;

            activePlayerIds.add(player.id);

            try {
                const loc = player.location;
                const posObj = { x: loc.x, y: loc.y, z: loc.z };

                // Populate caches instantly per-player so active hits are accurately logged
                cachedLocations.set(player.id, posObj);
                updatePlayerHistory(player.id, posObj);
            } catch (e) {
                // Safeguard against occasional engine entity-detachment errors
            }

            // Yield control back to engine processing after processing each individual player
            yield;
        }

        // Garbage collection: Clean caches of players who left the game since the last pass
        for (const cachedId of cachedLocations.keys()) {
            if (!activePlayerIds.has(cachedId)) {
                cachedLocations.delete(cachedId);
                playerHistory.delete(cachedId);
            }
        }
    } finally {
        // Unlock job state for the current pass
        isJobActive = false;

        // Only queue up the next loop execution if the module state remains running
        if (isModuleActive) {
            system.run(() => {
                system.runJob(continuousReachLoop());
            });
        }
    }
}

/**
 * STARTS the hit reach system checking pipeline.
 * Plugs into appropriate internal event-listeners and maps a recurring execution loop.
 */
export function startHitReachCheck() {
    if (isModuleActive) return;
    isModuleActive = true;

    hurtSubscription = onHitCached;
    EventCoordinator.subscribeBefore("entityHurt", hurtSubscription);

    // Call the seamless, background engine worker
    if (!isJobActive) {
        system.runJob(continuousReachLoop());
    }
}

/**
 * STOPS the hit reach check system.
 * Unbinds listeners, wipes lingering data caches, and destroys generator execution handles.
 */
export function stopHitReachCheck() {
    isModuleActive = false;

    if (hurtSubscription) {
        EventCoordinator.unsubscribeBefore("entityHurt", hurtSubscription);
        hurtSubscription = undefined;
    }

    // Flush maps to free heap space memory allocations
    playerHistory.clear();
    cachedLocations.clear();
}

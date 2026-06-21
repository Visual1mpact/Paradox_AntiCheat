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

let intervalId: number | undefined;
let hurtSubscription: ((event: EntityHurtBeforeEvent) => void) | undefined;
let reachJobId: number | null = null;

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
        if (s.id === attacker.id) continue;
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
 * SCALABLE GENERATOR ENGINE:
 * Distributes player tracking calculations across server ticks.
 * Processes chunks of players instead of running a full map lookup at once, minimizing tick overhead.
 */
function* reachUpdateGenerator(): Generator<void, void, unknown> {
    const players = PlayerCache.getPlayers();
    const playersPerTick = 5; // Chunk size: Adjust to higher (e.g. 10) or lower depending on total server capacity
    let processedCount = 0;

    for (const player of players) {
        if (player.isValid) {
            try {
                const loc = player.location;
                const posObj = { x: loc.x, y: loc.y, z: loc.z };

                // Populate caches instantly per-player so active hits are accurately logged
                cachedLocations.set(player.id, posObj);
                updatePlayerHistory(player.id, posObj);
            } catch (e) {
                // Safeguard against occasional engine entity-detachment errors
            }
        }

        processedCount++;

        // Chunk enforcement: Check if processing limits have reached maximum capacity for this tick
        if (processedCount >= playersPerTick) {
            processedCount = 0;
            yield; // Voluntarily pause execution loop, returning runtime control back to engine until next tick
        }
    }
}

/**
 * Wrapper handling execution management of the background generator loop.
 */
function executeReachUpdate() {
    // If a generator task sequence is currently active, cancel duplicate execution calls
    if (reachJobId !== null) return;

    const runner = reachUpdateGenerator();

    // Pass the generator to Bedrock's native runJob queue scheduler
    reachJobId = system.runJob(runner);
}

/**
 * STARTS the hit reach system checking pipeline.
 * Plugs into appropriate internal event-listeners and maps a recurring execution loop.
 */
export function startHitReachCheck() {
    stopHitReachCheck(); // Clear structural instances to prevent active leak layers

    hurtSubscription = onHitCached;
    EventCoordinator.subscribeBefore("entityHurt", hurtSubscription);

    // Call the background generator tracking execution engine every 1 tick
    intervalId = system.runInterval(() => {
        executeReachUpdate();
    }, 1);
}

/**
 * STOPS the hit reach check system.
 * Unbinds listeners, wipes lingering data caches, and destroys generator execution handles.
 */
export function stopHitReachCheck() {
    if (intervalId) system.clearRun(intervalId);
    intervalId = undefined;

    if (hurtSubscription) {
        EventCoordinator.unsubscribeBefore("entityHurt", hurtSubscription);
        hurtSubscription = undefined;
    }

    if (reachJobId !== null) {
        system.clearJob(reachJobId);
        reachJobId = null;
    }

    // Flush maps to free heap space memory allocations
    playerHistory.clear();
    cachedLocations.clear();
}

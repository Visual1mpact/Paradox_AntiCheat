import { Player, EntityHurtBeforeEvent, GameMode, EntityDamageCause } from "@minecraft/server";
import { SecurityClearanceManager } from "../classes/cache/level-four-security-tracker";
import { PlayerLocationCache } from "../classes/cache/player-location-cache";
import { EventCoordinator } from "../classes/core/event-coordinator";
import { FlagManager } from "../classes/logging/flag-manager";

const MAX_REACH = 4.2; // Slightly tuned for standard Bedrock hitboxes
const MAX_REACH_SQ = MAX_REACH * MAX_REACH;
const HARD_LIMIT_SQ = 100; // 10 blocks squared - instant fail without history check
const HISTORY_SIZE = 6;

interface Position {
    x: number;
    y: number;
    z: number;
}

let isModuleActive = false;
let hurtSubscription: ((event: EntityHurtBeforeEvent) => void) | undefined;
let leaveSubscription: ((event: { playerId: string }) => void) | undefined;

// Ring buffer / array for fast memory access
const victimHistory = new Map<string, Position[]>();

function distSq(ax: number, ay: number, az: number, bx: number, by: number, bz: number): number {
    const dx = ax - bx;
    const dy = ay - by;
    const dz = az - bz;
    return dx * dx + dy * dy + dz * dz;
}

function updateVictimHistory(playerId: string, loc: Position): void {
    let history = victimHistory.get(playerId);
    if (!history) {
        history = [];
        victimHistory.set(playerId, history);
    }

    if (history.length > 0) {
        const last = history[history.length - 1];
        if (last && last.x === loc.x && last.y === loc.y && last.z === loc.z) return;
    }

    history.push({ x: loc.x, y: loc.y, z: loc.z });
    if (history.length > HISTORY_SIZE) {
        history.shift();
    }
}

function alertStaff(attacker: Player, distSqValue: number): void {
    const staff = SecurityClearanceManager.getSecurityClearanceLevel4Players();
    const distance = Math.sqrt(distSqValue);
    FlagManager.logFlag(attacker, "Reach", `Player flagged for suspicious reach: ${distance.toFixed(2)} blocks.`);
    for (const s of staff) {
        if (!s.isValid || s.id === attacker.id) continue;
        s.sendMessage(`§2[§7Paradox§2]§o§7 §e[Reach] §f${attacker.name} §7hit too far: §e${distance.toFixed(2)} blocks`);
    }
}

function onHitCached(event: EntityHurtBeforeEvent): void {
    if (event.damageSource.cause !== EntityDamageCause.entityAttack) return;

    const attacker = event.damageSource.damagingEntity;
    const victim = event.hurtEntity;

    if (!(attacker instanceof Player) || !(victim instanceof Player)) return;
    if (attacker.getGameMode() === GameMode.Creative) return;

    const attackerTransform = PlayerLocationCache.getTransform(attacker);
    const victimTransform = PlayerLocationCache.getTransform(victim);

    if (!attackerTransform || !victimTransform) return;
    if (attackerTransform.dimension !== victimTransform.dimension) return;

    const aLoc = attackerTransform.location;
    const vLoc = victimTransform.location;

    // Record victim location on hit (lazily driven by event, eliminating runInterval)
    updateVictimHistory(victim.id, vLoc);

    const currentDistSq = distSq(aLoc.x, aLoc.y, aLoc.z, vLoc.x, vLoc.y, vLoc.z);

    // 1. Within legitimate reach -> allow
    if (currentDistSq <= MAX_REACH_SQ) return;

    // 2. Clear hack / teleports -> block immediately without history loop
    if (currentDistSq > HARD_LIMIT_SQ) {
        event.cancel = true;
        alertStaff(attacker, currentDistSq);
        return;
    }

    // 3. Check victim lag history (O(N) instead of O(N*M))
    const vHistory = victimHistory.get(victim.id);
    if (vHistory) {
        for (let i = vHistory.length - 1; i >= 0; i--) {
            const v = vHistory[i];
            if (!v) continue;
            if (distSq(aLoc.x, aLoc.y, aLoc.z, v.x, v.y, v.z) <= MAX_REACH_SQ) {
                return; // Valid hit against victim's recent historical location
            }
        }
    }

    // Flagged reach
    event.cancel = true;
    alertStaff(attacker, currentDistSq);
}

export function startHitReachCheck(): void {
    if (isModuleActive) return;
    isModuleActive = true;

    PlayerLocationCache.init();

    hurtSubscription = onHitCached;
    EventCoordinator.subscribeBefore("entityHurt", hurtSubscription);

    // Event-driven memory cleanup instead of iterating keys every tick
    leaveSubscription = (event) => {
        victimHistory.delete(event.playerId);
    };
    EventCoordinator.subscribeAfter("playerLeave", leaveSubscription);
}

export function stopHitReachCheck(): void {
    isModuleActive = false;

    if (hurtSubscription) {
        EventCoordinator.unsubscribeBefore("entityHurt", hurtSubscription);
        hurtSubscription = undefined;
    }

    if (leaveSubscription) {
        EventCoordinator.unsubscribeAfter("playerLeave", leaveSubscription);
        leaveSubscription = undefined;
    }

    victimHistory.clear();
}

import { system, Player, EntityHurtBeforeEvent, PlayerLeaveAfterEvent } from "@minecraft/server";
import { PlayerCache } from "../classes/cache/player-cache";
import { getSecurityClearanceLevel4Players } from "../utility/level-4-security-tracker";
import { EventCoordinator } from "../classes/event-coordinator";
import { FlagManager } from "../classes/logs/flag-manager";

/** Flag indicating whether the module is manually toggled on */
let isModuleActive = false;
/** Flag indicating whether the background generator worker is processing a frame */
let isJobActive = false;

let hurtSubscription: ((event: EntityHurtBeforeEvent) => void) | undefined;
let leaveSubscription: ((event: PlayerLeaveAfterEvent) => void) | undefined;

/**
 * Tracks rotation data for each player to identify smoothing patterns.
 */
const track = new Map<
    string,
    {
        lastYaw: number;
        lastPitch: number;
        deltas: number[];
        violations: number;
    }
>();

/**
 * Distributes an in-game alert notification to all active staff players
 * possessing Security Clearance Level 4 when unnatural rotation smoothing occurs.
 *
 * @param {Player} player - The player flagged for aimbot behavior.
 */
function alertStaff(player: Player): void {
    const staff = getSecurityClearanceLevel4Players();
    FlagManager.logFlag(player, "Aimbot", "Player is flagged for unnatural rotation smoothing.");
    for (const s of staff) {
        if (!s.isValid || s.id === player.id) continue;
        s.sendMessage(`§2[§7Paradox§2]§o§7 §e[Aimbot] §f${player.name} §7is flagged for unnatural rotation smoothing.`);
    }
}

/**
 * Continuous generator loop that iterates over cached players to analyze rotation variance.
 */
function* continuousAimbotLoop(): Generator<void, void, unknown> {
    if (isJobActive) return;
    isJobActive = true;

    try {
        if (!isModuleActive) return;

        for (const player of PlayerCache.getPlayers()) {
            if (!player?.isValid) continue;

            try {
                // Bypass for high-security users
                if ((player.getDynamicProperty("securityClearance") as number) === 4) continue;

                const rot = player.getRotation();
                const yaw = rot.y;
                const pitch = rot.x;

                let data = track.get(player.id);
                if (!data) {
                    track.set(player.id, { lastYaw: yaw, lastPitch: pitch, deltas: [], violations: 0 });
                    continue;
                }

                const dy = Math.abs(yaw - data.lastYaw);
                const dp = Math.abs(pitch - data.lastPitch);
                const totalDelta = dy + dp;

                // Only track when there is active movement and looking at an entity
                const ray = player.getEntitiesFromViewDirection({ maxDistance: 8 });

                if (totalDelta > 0.01 && ray.length > 0) {
                    data.deltas.push(totalDelta);
                    if (data.deltas.length > 15) data.deltas.shift();

                    if (data.deltas.length === 15) {
                        const avg = data.deltas.reduce((a, b) => a + b, 0) / 15;
                        const variance = data.deltas.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / 15;

                        // Heuristic: External smoothers produce high-precision
                        // movement with near-zero acceleration variance.
                        if (variance < 0.0001) {
                            data.violations++;
                        } else {
                            data.violations = Math.max(0, data.violations - 0.2);
                        }
                    }
                } else {
                    data.violations = Math.max(0, data.violations - 0.5);
                }

                if (data.violations >= 25) {
                    alertStaff(player);
                    data.violations = 0;
                }

                data.lastYaw = yaw;
                data.lastPitch = pitch;
            } catch (e) {
                // Fail silently for transient entity errors or loaded chunk boundary edge cases
            }

            // Yield control back to engine processing after evaluating each single player
            yield;
        }
    } finally {
        isJobActive = false;

        // Automatically recurse next pass cycle on the next frame tick allocation
        if (isModuleActive) {
            system.run(() => {
                system.runJob(continuousAimbotLoop());
            });
        }
    }
}

/**
 * Cleans up tracking data when a player leaves.
 */
function handlePlayerLeave(event: PlayerLeaveAfterEvent) {
    track.delete(event.playerId);
}

/**
 * Handles incoming damage events. If the attacker is flagged for
 * unnatural smoothing, the damage is cancelled.
 */
function handleHurtEvent(event: EntityHurtBeforeEvent): void {
    const attacker = event.damageSource.damagingEntity;
    if (!(attacker instanceof Player)) return;

    const data = track.get(attacker.id);

    // If violations are accumulating (Threshold: 10), cancel the damage.
    if (data && data.violations >= 10) {
        event.damage = 0;
    }
}

/**
 * Monitors players for external aim-assist patterns.
 */
export function startAimbotMonitor(): boolean {
    if (isModuleActive) return true;
    isModuleActive = true;

    if (!hurtSubscription) {
        hurtSubscription = handleHurtEvent;
        EventCoordinator.subscribeBefore("entityHurt", hurtSubscription);
    }

    if (!leaveSubscription) {
        leaveSubscription = handlePlayerLeave;
        EventCoordinator.subscribeAfter("playerLeave", leaveSubscription);
    }

    if (!isJobActive) {
        system.runJob(continuousAimbotLoop());
    }

    return true;
}

/**
 * Stop monitoring players for external aim-assist patterns.
 */
export function stopAimbotMonitor(): void {
    isModuleActive = false;

    if (hurtSubscription) {
        EventCoordinator.unsubscribeBefore("entityHurt", hurtSubscription);
        hurtSubscription = undefined;
    }
    if (leaveSubscription) {
        EventCoordinator.unsubscribeAfter("playerLeave", leaveSubscription);
        leaveSubscription = undefined;
    }

    track.clear();
}

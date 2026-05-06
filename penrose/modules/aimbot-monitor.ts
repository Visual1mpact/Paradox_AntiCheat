import { system, Player, EntityHurtBeforeEvent, PlayerLeaveAfterEvent } from "@minecraft/server";
import { PlayerCache } from "../classes/player-cache";
import { getSecurityClearanceLevel4Players } from "../utility/level-4-security-tracker";
import { EventCoordinator } from "../classes/event-coordinator";

let aimbotRunId: number | undefined;
let hurtSubscription: ((event: EntityHurtBeforeEvent) => void) | undefined;
let leaveSubscription: ((event: PlayerLeaveAfterEvent) => void) | undefined;
let aimbotJobId: number | null = null;

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
 * Generator that iterates over cached players to analyze rotation variance.
 */
function* aimbotCheckGenerator(): Generator<void, void, unknown> {
    for (const player of PlayerCache.getPlayers()) {
        if (player.isValid) {
            try {
                // Bypass for high-security users
                if ((player.getDynamicProperty("securityClearance") as number) === 4) continue;

                const rot = player.getRotation();
                const yaw = rot.y;
                const pitch = rot.x;

                let data = track.get(player.id);
                if (!data) {
                    data = { lastYaw: yaw, lastPitch: pitch, deltas: [], violations: 0 };
                    track.set(player.id, data);
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
                    // Notify Level 4 staff members about the suspicious behavior
                    const staff = getSecurityClearanceLevel4Players();
                    for (const s of staff) {
                        if (s.id === player.id) continue;
                        s.sendMessage(`§2[§7Paradox§2]§o§7 §e[Aimbot] §f${player.name} §7is flagged for unnatural rotation smoothing.`);
                    }

                    data.violations = 0;
                }

                data.lastYaw = yaw;
                data.lastPitch = pitch;
            } catch (e) {
                // Fail silently for transient entity errors
            }
        }
        yield;
    }
}

/**
 * Executes the aimbot check as a background job.
 */
async function executeAimbotCheck(): Promise<void> {
    if (aimbotJobId !== null) return;

    await new Promise<void>((resolve) => {
        function* runner() {
            try {
                yield* aimbotCheckGenerator();
            } finally {
                aimbotJobId = null;
                resolve();
            }
        }
        aimbotJobId = system.runJob(runner());
    });
}

/**
 * Cleans up tracking data when a player leaves.
 * @param event - The player leave event.
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
        event.cancel = true;
    }
}

/**
 * Monitors players for external aim-assist patterns.
 */
export async function startAimbotMonitor(): Promise<boolean> {
    if (aimbotRunId) return true;

    hurtSubscription = handleHurtEvent;
    leaveSubscription = handlePlayerLeave;

    EventCoordinator.subscribeBefore("entityHurt", hurtSubscription);
    EventCoordinator.subscribeAfter("playerLeave", leaveSubscription);

    let isRunning = false;
    let runIdBackup: number | undefined;

    aimbotRunId = system.runInterval(async () => {
        if (isRunning) {
            system.clearRun(aimbotRunId as number);
            aimbotRunId = runIdBackup;
            return;
        }
        runIdBackup = aimbotRunId;
        isRunning = true;
        await executeAimbotCheck();
        isRunning = false;
    }, 1); // Maintain 1-tick granularity while spreading player load

    return true;
}

/**
 * Stop monitoring players for external aim-assist patterns.
 */
export function stopAimbotMonitor(): void {
    if (aimbotRunId) {
        system.clearRun(aimbotRunId);
        aimbotRunId = undefined;
    }
    if (hurtSubscription) {
        EventCoordinator.unsubscribeBefore("entityHurt", hurtSubscription);
        hurtSubscription = undefined;
    }
    if (leaveSubscription) {
        EventCoordinator.unsubscribeAfter("playerLeave", leaveSubscription);
        leaveSubscription = undefined;
    }
    if (aimbotJobId !== null) {
        system.clearJob(aimbotJobId);
        aimbotJobId = null;
    }
    track.clear();
}

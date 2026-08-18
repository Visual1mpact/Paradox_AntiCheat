import { world, system, Player, InputButton, ButtonState, PlayerButtonInputAfterEvent, PlayerLeaveAfterEvent, ChatSendBeforeEvent, EntityHurtBeforeEvent, EntityDamageCause } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { PlayerCache } from "../../classes/cache/player-cache";
import { EventCoordinator } from "../../classes/event-coordinator";

let runId: number | undefined;
let jobId: number | null = null;
let inputSubscription: ((arg: PlayerButtonInputAfterEvent) => void) | undefined;
let leaveSubscription: ((arg: PlayerLeaveAfterEvent) => void) | undefined;
let hurtSubscription: ((arg: EntityHurtBeforeEvent) => void) | undefined;

/**
 * Stores jump timing data to detect double-taps.
 */
const jumpCounters = new Map<string, { tick: number; count: number }>();

/**
 * Stores remaining air impulse charges.
 */
const remainingJumps = new Map<string, number>();

/**
 * Tracks players who have performed a double jump and are immune to the next fall damage.
 */
const activeDoubleJumpers = new Set<string>();

/**
 * Generator function to identify players on the ground and reset their jump charges.
 * Using PlayerCache.getPlayers() for better performance.
 */
function* groundCheckGenerator(): Generator<void, void, unknown> {
    for (const player of PlayerCache.getPlayers()) {
        if (player.isOnGround) {
            remainingJumps.set(player.id, 2);
            activeDoubleJumpers.delete(player.id);
        }
        yield; // Slice execution after each player
    }
}

/**
 * Executes the ground check logic as a background job.
 */
async function executeGroundCheck(): Promise<void> {
    if (jobId !== null) return;

    await new Promise<void>((resolve) => {
        function* runner() {
            try {
                yield* groundCheckGenerator();
            } finally {
                jobId = null;
                resolve();
            }
        }
        jobId = system.runJob(runner());
    });
}

/**
 * Handles raw button inputs. Filters for the Jump button and increments
 * jump counters for double-tap detection.
 */
function handleButtonInput(event: PlayerButtonInputAfterEvent) {
    // Filter for the jump button pressed state since the coordinator doesn't support subscription options
    if (event.button !== InputButton.Jump || event.newButtonState !== ButtonState.Pressed) return;

    const player = event.player;
    const playerId = player.id;
    const currentTick = system.currentTick;

    let data = jumpCounters.get(playerId);
    if (!data) {
        data = { tick: 0, count: 0 };
        jumpCounters.set(playerId, data);
    }

    // If more than 10 ticks have passed since the last press, reset the double-tap count
    if (currentTick - data.tick >= 10) {
        data.count = 1;
    } else {
        data.count++;
        if (data.count >= 2) {
            data.count = 0;
            applyDoubleJump(player);
        }
    }
    data.tick = currentTick;
}

/**
 * Applies a vertical impulse if the player has charges remaining.
 */
function applyDoubleJump(player: Player) {
    const charges = remainingJumps.get(player.id) ?? 0;
    if (charges <= 1) return; // Charge 2 is the double jump charge

    remainingJumps.set(player.id, charges - 1);
    player.applyImpulse({ x: 0, y: 0.7, z: 0 });
    activeDoubleJumpers.add(player.id);
}

/**
 * Prevents fall damage if the player is currently in a double-jump state.
 */
function handleHurt(event: EntityHurtBeforeEvent) {
    if (!(event.hurtEntity instanceof Player)) return;
    if (event.damageSource.cause !== EntityDamageCause.fall) return;

    if (activeDoubleJumpers.has(event.hurtEntity.id)) {
        event.damage = 0;
    }
}

/**
 * Cleans up player data when they leave to prevent memory leaks.
 */
function handlePlayerLeave(event: PlayerLeaveAfterEvent) {
    jumpCounters.delete(event.playerId);
    remainingJumps.delete(event.playerId);
    activeDoubleJumpers.delete(event.playerId);
}

/**
 * Starts the high-performance Double Jump module.
 */
export function startDoubleJump() {
    if (runId) return;

    EventCoordinator.subscribeAfter("playerButtonInput", handleButtonInput);
    EventCoordinator.subscribeBefore("entityHurt", handleHurt);
    EventCoordinator.subscribeAfter("playerLeave", handlePlayerLeave);

    inputSubscription = handleButtonInput;
    leaveSubscription = handlePlayerLeave;
    hurtSubscription = handleHurt;

    let isRunning = false;
    let runIdBackup: number | undefined;

    runId = system.runInterval(async () => {
        if (isRunning) {
            system.clearRun(runId as number);
            runId = runIdBackup;
            return;
        }
        runIdBackup = runId;
        isRunning = true;
        await executeGroundCheck();
        isRunning = false;
    }, 1);
}

/**
 * Stops the module and clears all tracked data.
 */
export function stopDoubleJump() {
    if (runId) system.clearRun(runId);
    if (inputSubscription) EventCoordinator.unsubscribeAfter("playerButtonInput", inputSubscription);
    if (hurtSubscription) EventCoordinator.unsubscribeBefore("entityHurt", hurtSubscription);
    if (leaveSubscription) EventCoordinator.unsubscribeAfter("playerLeave", leaveSubscription);
    if (jobId !== null) system.clearJob(jobId);

    jumpCounters.clear();
    remainingJumps.clear();
    activeDoubleJumpers.clear();
    runId = undefined;
    jobId = null;
}

/**
 * Command to toggle the Double Jump utility.
 */
export const doubleJumpCommand: Command = {
    name: "doublejump",
    description: "Toggle the high-performance double jump utility.",
    usage: "{prefix}doublejump",
    examples: ["{prefix}doublejump"],
    category: "Utility",
    securityClearance: 4,
    icon: "textures/ui/jump_boost_effect",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Double Jump Utility",
        description:
            "Enable or disable the mid-air double jump functionality for all players.\n\n" +
            "§7• When enabled, players can double-tap the jump button in mid-air to receive a vertical boost.\n" +
            "§7• Charges reset automatically upon touching the ground.\n\n",
        actions: [{ name: "Toggle Double Jump", icon: "textures/ui/refresh_light" }],
    },
    execute: (message?: ChatSendBeforeEvent) => {
        if (!message) return;
        if (runId !== undefined) {
            stopDoubleJump();
            world.setDynamicProperty("doubleJumpEnabled", false);
            message.sender.sendMessage("§2[§7Paradox§2]§o§7 Double Jump utility: §4Disabled");
        } else {
            startDoubleJump();
            world.setDynamicProperty("doubleJumpEnabled", true);
            message.sender.sendMessage("§2[§7Paradox§2]§o§7 Double Jump utility: §aEnabled");
        }
    },
};

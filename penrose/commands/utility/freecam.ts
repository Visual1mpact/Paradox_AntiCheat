import { ChatSendBeforeEvent, GameMode, InputPermissionCategory, Player, EntityHurtBeforeEvent, system, world, Vector3, InputButton } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";
import { PlayerCache } from "../../classes/cache/player-cache";
import { EventCoordinator } from "../../classes/core/event-coordinator";

const freecamUsers = new Set<string>();
let intervalId: number | undefined;
let isEventsSubscribed = false;

// Track active camera positions, speeds, and input states
const cameraPositions = new Map<string, Vector3>();
const cameraSpeed = new Map<string, number>();
const sneakToggleState = new Map<string, boolean>();
const lastButtonState = new Map<string, { jump: boolean; sneak: boolean }>();

/**
 * Cleans and trims raw player name argument strings.
 *
 * @param {string} name - Raw input string.
 * @returns {string} Cleaned name string.
 */
function cleanName(name: string): string {
    return name.trim().replace(/["@]/g, "");
}

/**
 * Evaluates whether the player is attempting to descend, cancelling descent state
 * if upward movement, direction input, or explicit un-sneak occurs.
 *
 * @param {Player} player - Target player entity.
 * @param {boolean} isJumping - Whether the jump input is currently active.
 * @param {boolean} hasMovementInput - Whether forward, backward, or strafe inputs are active.
 * @returns {boolean} True if player should move downward.
 */
function isPlayerDescending(player: Player, isJumping: boolean, hasMovementInput: boolean): boolean {
    const buttonState = player.inputInfo.getButtonState("Sneak" as any);
    let isDescending = sneakToggleState.get(player.id) ?? false;

    if (buttonState === "Pressed") {
        isDescending = !isDescending;
    }

    if (isJumping || hasMovementInput) {
        isDescending = false;
    }

    sneakToggleState.set(player.id, isDescending);
    return isDescending;
}

/**
 * Updates freecam speed dynamically based on Jump and Sneak button presses.
 * Executes in O(1) complexity.
 *
 * @param {Player} player - Target player entity.
 * @param {boolean} isJumping - Current jump button pressed state.
 * @param {boolean} isSneaking - Current sneak button pressed state.
 * @returns {number} Updated camera speed.
 */
function updateCameraSpeed(player: Player, isJumping: boolean, isSneaking: boolean): number {
    let speed = cameraSpeed.get(player.id) ?? 0.5;
    const lastState = lastButtonState.get(player.id) ?? { jump: false, sneak: false };

    // Trigger speed adjustment on initial button press state change
    const jumpPressed = isJumping && !lastState.jump;
    const sneakPressed = isSneaking && !lastState.sneak;

    if (jumpPressed || sneakPressed) {
        speed = Math.max(0.1, Math.min(speed + (jumpPressed ? 0.1 : -0.1), 5));
        cameraSpeed.set(player.id, speed);
        player.onScreenDisplay.setActionBar(`§2[§7Paradox§2] §7Freecam speed: §e${speed.toFixed(1)}x§r`);
    }

    lastButtonState.set(player.id, { jump: isJumping, sneak: isSneaking });
    return speed;
}

/**
 * Updates freecam perspective and positions the camera independently from the player body.
 *
 * @param {Player} player - Target player entity.
 */
function updateCamera(player: Player): void {
    const isJumping = player.inputInfo.getButtonState("Jump" as InputButton) === "Pressed";
    const moveInput = player.inputInfo.getMovementVector();
    const hasMovementInput = moveInput.x !== 0 || moveInput.y !== 0;

    const isSneaking = isPlayerDescending(player, isJumping, hasMovementInput);
    const speed = updateCameraSpeed(player, isJumping, isSneaking);

    let currentPos = cameraPositions.get(player.id);

    player.inputPermissions.setPermissionCategory(InputPermissionCategory.Movement, false);
    if (!currentPos) {
        const headPos = player.getHeadLocation();
        currentPos = {
            x: headPos.x,
            y: headPos.y,
            z: headPos.z,
        };
    }

    // Get true 3D unit direction vector (pitch + yaw combined) from current player view orientation
    const viewDir: Vector3 = player.getViewDirection();

    // Compute right vector using cross product with world UP vector (0, 1, 0)
    const right = {
        x: -viewDir.z,
        z: viewDir.x,
    };

    // Normalize 2D horizontal right vector length
    const rightLen = Math.hypot(right.x, right.z) || 1;
    const rightNormalized = {
        x: right.x / rightLen,
        z: right.z / rightLen,
    };

    // Ignore vertical movement completely when holding jump or sneak (reserved strictly for speed adjustment)
    const isSpeedControlActive = isJumping || isSneaking;
    const verticalMovement = isSpeedControlActive ? 0 : 0;

    // Calculate full 3D displacement vector based on view look direction
    const dx = (moveInput.y * viewDir.x - moveInput.x * rightNormalized.x) * speed;
    const dy = (moveInput.y * viewDir.y + verticalMovement) * speed;
    const dz = (moveInput.y * viewDir.z - moveInput.x * rightNormalized.z) * speed;

    currentPos.x += dx;
    currentPos.y += dy;
    currentPos.z += dz;

    cameraPositions.set(player.id, currentPos);

    // Set camera position using live camera rotation input
    player.camera.setCamera("minecraft:free", {
        location: currentPos,
        rotation: player.getRotation(),
    });
}

/**
 * Handles damage event to safety auto-disable freecam when hurt.
 *
 * @param {EntityHurtBeforeEvent} event - Hurt before event.
 */
function handleEntityHurt(event: EntityHurtBeforeEvent): void {
    const { hurtEntity } = event;
    if (hurtEntity instanceof Player && freecamUsers.has(hurtEntity.id)) {
        event.damage = 0;
        toggle(hurtEntity, false);
    }
}

/**
 * Ensures global event listeners are active if not already subscribed.
 */
function ensureEventsSubscribed(): void {
    if (isEventsSubscribed) return;
    EventCoordinator.subscribeBefore("entityHurt", handleEntityHurt);
    isEventsSubscribed = true;
}

/**
 * Unsubscribes event listeners when no users are active to conserve resources.
 */
function unsubscribeEvents(): void {
    if (!isEventsSubscribed) return;
    EventCoordinator.unsubscribeBefore("entityHurt", handleEntityHurt);
    isEventsSubscribed = false;
}

/**
 * Starts global freecam tick loop if not already running.
 */
function ensureLoopRunning(): void {
    ensureEventsSubscribed();

    if (intervalId !== undefined) return;

    intervalId = system.runInterval(() => {
        for (const playerId of freecamUsers) {
            const player = PlayerCache.getPlayerById(playerId);
            if (!player) {
                freecamUsers.delete(playerId);
                cameraPositions.delete(playerId);
                cameraSpeed.delete(playerId);
                sneakToggleState.delete(playerId);
                lastButtonState.delete(playerId);
                continue;
            }
            updateCamera(player);
        }

        if (freecamUsers.size === 0) {
            cleanupActiveSession();
        }
    });
}

/**
 * Stops background execution loop and cleans up event subscriptions when empty.
 */
function cleanupActiveSession(): void {
    if (intervalId !== undefined) {
        system.clearRun(intervalId);
        intervalId = undefined;
    }
    unsubscribeEvents();
}

/**
 * Teleports the camera position of an active freecam user to a target player.
 *
 * @param {Player} player - The freecam user.
 * @param {Player} targetPlayer - The player to teleport the camera to.
 * @returns {boolean} True if teleportation succeeded, false otherwise.
 */
export function teleportCameraToPlayer(player: Player, targetPlayer: Player): boolean {
    if (!freecamUsers.has(player.id) || !targetPlayer?.isValid) {
        return false;
    }

    const headLocation = targetPlayer.getHeadLocation();
    const targetPos: Vector3 = {
        x: headLocation.x,
        y: headLocation.y,
        z: headLocation.z,
    };

    cameraPositions.set(player.id, targetPos);
    player.camera.setCamera("minecraft:free", {
        location: targetPos,
        rotation: targetPlayer.getRotation(),
    });

    return true;
}

/**
 * Disables freecam mode for a given player, restores original position, game mode, and camera perspective.
 *
 * @param {Player} player - Target player entity.
 */
export function disable(player: Player): void {
    freecamUsers.delete(player.id);

    player.inputPermissions.setPermissionCategory(InputPermissionCategory.Movement, true);
    player.camera.clear();

    // Restore player position & rotation from stored dynamic property
    const originProperty = player.getDynamicProperty("FreecamOrigin") as string | undefined;
    if (originProperty) {
        try {
            const origin = JSON.parse(originProperty);
            player.teleport(origin.location, { rotation: origin.rotation });
        } catch {
            // Ignore parse errors if dynamic property was malformed
        }
        player.setDynamicProperty("FreecamOrigin", undefined);
    }

    // Restore original game mode (vanish disable)
    const backupGameMode = player.getDynamicProperty("GameModeBackup");
    if (backupGameMode !== undefined) {
        player.setGameMode(backupGameMode as GameMode);
        player.setDynamicProperty("GameModeBackup", undefined);
    }

    cameraPositions.delete(player.id);
    cameraSpeed.delete(player.id);
    sneakToggleState.delete(player.id);
    lastButtonState.delete(player.id);

    if (freecamUsers.size === 0) {
        cleanupActiveSession();
    }
}

/**
 * Toggles freecam mode on or off for a given player, recording starting position
 * into dynamic properties and handling vanish state via Spectator game mode.
 *
 * @param {Player} sender - Target player entity.
 * @param {boolean} [forceState] - Optional explicit boolean state.
 */
export function toggle(sender?: Player, forceState?: boolean): void {
    if (!sender?.id) return;

    const currentState = freecamUsers.has(sender.id);
    const newState = forceState ?? !currentState;

    if (currentState === newState) {
        sender.sendMessage(`§2[§7Paradox§2]§o§7 Freecam is already ${newState ? "§aenabled" : "§4disabled"}§7.`);
        return;
    }

    if (newState) {
        // Record starting location & rotation into dynamic property
        const originData = JSON.stringify({
            location: { x: sender.location.x, y: sender.location.y, z: sender.location.z },
            rotation: sender.getRotation(),
        });
        sender.setDynamicProperty("FreecamOrigin", originData);

        // Backup game mode and set to spectator (vanish enable)
        const currentGamemode = sender.getGameMode();
        if (currentGamemode !== GameMode.Spectator) {
            sender.setDynamicProperty("GameModeBackup", currentGamemode);
            sender.setGameMode(GameMode.Spectator);
        }

        freecamUsers.add(sender.id);
        ensureLoopRunning();
    } else {
        disable(sender);
    }
    sender.sendMessage(`§2[§7Paradox§2]§o§7 Freecam has been ${newState ? "§aenabled" : "§4disabled"}§7.`);
}

/**
 * Validates whether the given subcommand is valid.
 *
 * @param {string} [subCommand] - User-supplied subcommand string.
 * @returns {boolean} True if subCommand is "enable", "disable", or "tp".
 */
function isValidSubCommand(subCommand?: string): boolean {
    return subCommand === "enable" || subCommand === "disable" || subCommand === "tp";
}

/**
 * Sends command usage message to the invoking player.
 *
 * @param {Player} player - Invoking player entity.
 */
function sendUsageMessage(player: Player): void {
    const prefix = (world.getDynamicProperty("__prefix") as string) ?? ":";
    player.sendMessage(`§o§c[Paradox] Usage: ${prefix}freecam [ enable | disable | tp <player> ]`);
}

/**
 * Represents the command to control freecam mode.
 */
export const freecamCommand: Command = {
    name: "freecam",
    description: "Toggles freecam spectator mode to detach camera movement with dynamic speed control.",
    usage: "{prefix}freecam [ enable | disable | tp <player> ]",
    examples: ["{prefix}freecam enable", "{prefix}freecam disable", "{prefix}freecam tp Steve"],
    category: "Utility",
    securityClearance: 1,
    icon: "textures/items/ender_eye.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Freecam Mode Control",
        description:
            "Detach your perspective and move freely around the environment in spectator mode.\n\n" +
            "§7• §fEnable Freecam§7: Detaches camera perspective, enables vanish (Spectator mode), and tracks starting position.\n" +
            "§7• §fDisable Freecam§7: Restores normal movement permissions, original position, original game mode, and camera perspective.\n" +
            "§7• §fTeleport Camera§7: Relocates camera position directly to a target player.\n\n" +
            "§7Controls & Adjustments:\n" +
            "§7• Press §eJump§7 / §eSneak§7: Increase or decrease camera movement speed (does not move position vertically).\n\n" +
            "§7Rules & Behavior:\n" +
            "§7• Requires security clearance level 1 (level 4 required for camera teleportation).\n" +
            "§7• Automatically disables and prevents damage when taking hits.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Enable Freecam",
                command: ["enable"],
                icon: "textures/ui/check.png",
                description: "Detaches camera and enables spectator camera mode.",
            },
            {
                name: "Disable Freecam",
                command: ["disable"],
                icon: "textures/ui/cancel.png",
                description: "Restores normal player movement and clears freecam.",
            },
            {
                name: "Teleport Camera to Player",
                securityClearance: 4,
                command: ["tp"],
                icon: "textures/ui/icon_multiplayer.png",
                description: "Teleport freecam perspective directly to a target player.",
                requiredFields: ["targetPlayerSelection"],
                generateModalForm: true,
            },
        ],
        dynamicFields: [
            {
                name: "\nTarget Player:",
                type: "dropdown",
                sourceType: "players",
                requiredFields: ["targetPlayerSelection"],
            },
        ],
    },

    /**
     * Executes the freecam command.
     *
     * @param {ChatSendBeforeEvent | undefined} message - The message object.
     * @param {string[]} [args] - Command arguments.
     * @returns {Promise<void>}
     */
    execute: async (message?: ChatSendBeforeEvent, args: string[] = []): Promise<void> => {
        if (!message) return;
        const player = message.sender;

        const subCommand = args[0]?.toLowerCase().trim();

        if (args.length > 0 && !isValidSubCommand(subCommand)) {
            sendUsageMessage(player);
            return;
        }

        if (!subCommand) {
            toggle(player);
            return;
        }

        if (subCommand === "tp") {
            if (!freecamUsers.has(player.id)) {
                toggle(player, true);
            }

            const targetName = cleanName(args.slice(1).join(" "));
            if (!targetName) {
                player.sendMessage("§o§c[Paradox] Please specify a target player name to teleport the camera to.");
                return;
            }

            const targetPlayer = PlayerCache.getPlayerByName(targetName);
            if (!targetPlayer || !targetPlayer.isValid) {
                player.sendMessage(`§o§c[Paradox] Player '${targetName}' could not be found or is offline.`);
                return;
            }

            const success = teleportCameraToPlayer(player, targetPlayer);
            if (success) {
                player.sendMessage(`§2[§7Paradox§2]§o§7 Teleported freecam camera to §e${targetPlayer.name}§7.`);
            } else {
                player.sendMessage("§o§c[Paradox] Unable to teleport camera to target player.");
            }
            return;
        }

        const shouldEnable = subCommand === "enable";
        toggle(player, shouldEnable);
    },
};

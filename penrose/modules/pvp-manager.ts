import {
    Dimension,
    Effect,
    EffectAddBeforeEvent,
    EntityEquippableComponent,
    EntityHitEntityAfterEvent,
    EquipmentSlot,
    ItemStack,
    Player,
    PlayerLeaveBeforeEvent,
    PlayerSpawnAfterEvent,
    ProjectileHitEntityAfterEvent,
    system,
    Vector3,
    world,
} from "@minecraft/server";
import { MessageFormData } from "@minecraft/server-ui";

let cooldownTicks = 2400; // 2 minutes cooldown in ticks (2400 ticks = 2 minutes)
const punishmentProperty = "pvpPunishment"; // Dynamic property to track if a player should be punished
const pvpStatusProperty = "pvpEnabled"; // Dynamic property to track if a player has PvP enabled
const messageCooldownTicks = 600; // Adjust this value as needed
const playerMessageTimestamps = new Map<string, number>(); // Map to store the last message timestamp for each player

// Variables to store the subscription references
let entityHitEntitySubscription: (arg: EntityHitEntityAfterEvent) => void;
let playerLeaveSubscription: (arg: PlayerLeaveBeforeEvent) => void;
let playerSpawnSubscription: (arg: PlayerSpawnAfterEvent) => void;
let projectileHitEntitySubscription: (arg: ProjectileHitEntityAfterEvent) => void;
let effectAddSubscription: (arg: EffectAddBeforeEvent) => void;

// Map to store player data with player ID as the key
const playerDataMap = new Map<
    string,
    {
        inventory: ItemStack[];
        equipment: ItemStack[];
        location: Vector3;
        dimension: Dimension;
    }
>();

/**
 * Converts a given time in seconds to a more human-readable format (hours, minutes, and seconds).
 *
 * @param {number} seconds - The time in seconds to be converted.
 * @returns {string} - A string representing the time in a human-readable format.
 */
function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    let formattedTime = "";

    if (hours > 0) {
        formattedTime += `${hours} hour${hours > 1 ? "s" : ""}`;
    }

    if (minutes > 0) {
        if (formattedTime) formattedTime += " ";
        formattedTime += `${minutes} minute${minutes > 1 ? "s" : ""}`;
    }

    if (remainingSeconds > 0 || (hours === 0 && minutes === 0)) {
        if (formattedTime) formattedTime += " ";
        formattedTime += `${remainingSeconds} second${remainingSeconds > 1 ? "s" : ""}`;
    }

    return formattedTime;
}

/**
 * Determines if a message can be sent to a player based on the cooldown period.
 * This helps prevent spamming by ensuring messages are only sent if a certain amount of time has passed
 * since the last message was sent to the player.
 *
 * @param {string} playerId - The ID of the player to check.
 * @returns {boolean} - Returns `true` if the message can be sent (i.e., the cooldown period has elapsed),
 * otherwise returns `false`.
 */
function canSendMessage(playerId: string): boolean {
    const currentTick = system.currentTick;
    const lastMessageTick = playerMessageTimestamps.get(playerId) ?? 0;

    // Check if the cooldown period has passed since the last message was sent
    if (currentTick - lastMessageTick >= messageCooldownTicks) {
        // Update the timestamp of the last message sent
        playerMessageTimestamps.set(playerId, currentTick);
        return true;
    }

    return false;
}

/**
 * Initializes the PvP system by setting up event listeners for PvP interactions and player actions.
 * This function should be called to enable the PvP management features in the game.
 */
function setupPvPSystem() {
    // Event: When effect is added to an entity
    effectAddSubscription = world.beforeEvents.effectAdd.subscribe((event) => {
        const { entity } = event;

        if (!(entity instanceof Player)) {
            return;
        }

        const effects = entity.getEffects();

        entity.setDynamicProperty("storedEffects", JSON.stringify(effects));
    });

    // Event: When one entity hits another entity
    entityHitEntitySubscription = world.afterEvents.entityHitEntity.subscribe((event) => {
        const attacker = event.damagingEntity;
        const victim = event.hitEntity;

        // Ensure both entities are players
        if (attacker instanceof Player && victim instanceof Player) {
            // Check if the victim is in a non-PvP area (has the bypass tag)
            if (victim.hasTag("paradoxBypassPvPCheck")) {
                // Restore the victim's health without penalizing the attacker
                const healthComponentVictim = victim.getComponent("health");
                if (healthComponentVictim) {
                    const currentHealthVictim = healthComponentVictim.currentValue;
                    const beforeHealthVictim = (victim.getDynamicProperty("paradoxCurrentHealth") as number) ?? currentHealthVictim;

                    if (beforeHealthVictim > currentHealthVictim) {
                        const healthDiffVictim = beforeHealthVictim - currentHealthVictim;
                        const restoreHealthVictim = currentHealthVictim + healthDiffVictim;

                        // Restore the victim's health only
                        healthComponentVictim.setCurrentValue(restoreHealthVictim);
                    }
                }

                if (canSendMessage(attacker.id)) {
                    attacker.sendMessage(`§2[§7Paradox§2]§o§7 PvP is disabled in this area. No damage was dealt.`);
                }

                return; // Skip further logic
            }

            // Get PvP status for both attacker and victim
            const isPvPEnabledForAttacker = attacker.getDynamicProperty(pvpStatusProperty) ?? world.gameRules.pvp;
            const isPvPEnabledForVictim = victim.getDynamicProperty(pvpStatusProperty) ?? world.gameRules.pvp;

            // If both players have PvP enabled, handle combat without restoration
            if (isPvPEnabledForAttacker && isPvPEnabledForVictim) {
                // Refresh PvP cooldown for both players
                const currentTick = system.currentTick;
                const cooldownExpiryTick = currentTick + cooldownTicks;

                attacker.setDynamicProperty("pvpCooldown", cooldownExpiryTick);
                victim.setDynamicProperty("pvpCooldown", cooldownExpiryTick);

                if (canSendMessage(attacker.id)) {
                    const remainingSeconds = Math.floor(cooldownTicks / 20); // Convert ticks to seconds
                    const remainingTime = formatTime(remainingSeconds);
                    attacker.sendMessage(`§2[§7Paradox§2]§o§7 You are in PvP combat! Logging out is disabled for ${remainingTime}.`);
                }

                if (canSendMessage(victim.id)) {
                    const remainingSeconds = Math.floor(cooldownTicks / 20);
                    const remainingTime = formatTime(remainingSeconds);
                    victim.sendMessage(`§2[§7Paradox§2]§o§7 You are in PvP combat! Logging out is disabled for ${remainingTime}.`);
                }
                return; // Skip further adjustments
            }

            // Health restoration logic for PvP-disabled victim
            if (!isPvPEnabledForVictim) {
                const healthComponentVictim = victim.getComponent("health");
                if (healthComponentVictim) {
                    const currentHealthVictim = healthComponentVictim.currentValue;
                    const beforeHealthVictim = (victim.getDynamicProperty("paradoxCurrentHealth") as number) ?? currentHealthVictim;

                    if (beforeHealthVictim > currentHealthVictim) {
                        const healthDiffVictim = beforeHealthVictim - currentHealthVictim;
                        const restoreHealthVictim = currentHealthVictim + healthDiffVictim;

                        const healthComponentAttacker = attacker.getComponent("health");
                        if (healthComponentAttacker) {
                            const currentHealthAttacker = healthComponentAttacker.currentValue;
                            const newHealthAttacker = Math.max(currentHealthAttacker - healthDiffVictim, 0);

                            healthComponentAttacker.setCurrentValue(newHealthAttacker);
                        }

                        healthComponentVictim.setCurrentValue(restoreHealthVictim);
                    }
                }

                // Refresh PvP cooldown for the attacker
                const currentTick = system.currentTick;
                const cooldownExpiryTick = currentTick + cooldownTicks;

                attacker.setDynamicProperty("pvpCooldown", cooldownExpiryTick);

                if (canSendMessage(attacker.id)) {
                    const remainingSeconds = Math.floor(cooldownTicks / 20); // Convert ticks to seconds
                    const remainingTime = formatTime(remainingSeconds);
                    attacker.sendMessage(`§2[§7Paradox§2]§o§7 You are in PvP combat! Logging out is disabled for ${remainingTime}.`);
                }

                if (canSendMessage(attacker.id)) {
                    attacker.sendMessage(`§2[§7Paradox§2]§o§7 ${victim.name} has PvP disabled!`);
                }
            }
        }
    });

    // Event: When a player logs out
    playerLeaveSubscription = world.beforeEvents.playerLeave.subscribe(async (event) => {
        const player = event.player;

        playerMessageTimestamps.delete(player.id);

        // Bypass if they have the tag
        if (player.hasTag("paradoxBypassPvPCheck")) {
            return;
        }

        // Check if the player is in cooldown
        const cooldownExpiryTick = player.getDynamicProperty("pvpCooldown") as number;
        const currentTick = system.currentTick;

        // If the player logs out before the cooldown expires, drop their inventory and mark them for punishment
        if (cooldownExpiryTick && currentTick < cooldownExpiryTick) {
            // Set punishment property
            player.setDynamicProperty(punishmentProperty, true);

            // Save data to the map
            const inventoryComponent = player.getComponent("inventory")?.container;
            const equipmentComponent = player.getComponent("equippable");

            const inventoryItems: ItemStack[] = [];
            const equipmentItems: ItemStack[] = [];

            // Collect inventory items
            if (inventoryComponent) {
                for (let slot = 0; slot < inventoryComponent.size; slot++) {
                    const item = inventoryComponent.getItem(slot);
                    if (item) {
                        inventoryItems.push(item);
                    }
                }
            }

            // Collect equipment items
            if (equipmentComponent) {
                for (const slot of Object.values(EquipmentSlot)) {
                    const item = equipmentComponent.getEquipment(slot);
                    // Skip the Mainhand slot to prevent duplicates
                    if (slot === EquipmentSlot.Mainhand) {
                        continue;
                    }

                    if (item) {
                        equipmentItems.push(item);
                    }
                }
            }

            // Save player data
            playerDataMap.set(player.id, {
                inventory: inventoryItems,
                equipment: equipmentItems,
                location: player.location,
                dimension: player.dimension,
            });

            // Drop stored player data
            await dropStoredPlayerData(player.id);
        }
    });

    // Event: When a player spawns
    playerSpawnSubscription = world.afterEvents.playerSpawn.subscribe((event) => {
        function alertNotice(player: Player) {
            const alertGUI = new MessageFormData();
            alertGUI.title("               PvP Punishment"); // title does not center automatically
            alertGUI.body("You have been punished for logging out during PvP! Your inventory and equipment has been wiped out!");
            alertGUI.button2("Confirm");
            alertGUI.button1("Quit");
            alertGUI
                .show(player)
                .then((result) => {
                    if (result && result.canceled && result.cancelationReason === "UserBusy") {
                        return alertNotice(player);
                    }

                    if (result.selection === 0) {
                        world.getDimension(player.dimension.id).runCommand(`kick ${player.name} §o§7\n\nYou have selected to quit the game.`);
                    }
                })
                .catch((error: Error) => {
                    console.error("Paradox Unhandled Rejection: ", error);
                    if (error instanceof Error) {
                        // Check if error.stack exists before trying to split it
                        if (error.stack) {
                            const stackLines: string[] = error.stack.split("\n");
                            if (stackLines.length > 1) {
                                const sourceInfo: string[] = stackLines;
                                console.error("Error originated from:", sourceInfo[0]);
                            }
                        }
                    }
                });
        }

        const player = event.player;

        // Bypass if they have the tag
        if (player.hasTag("paradoxBypassPvPCheck")) {
            return;
        }

        // Check if the player should be punished
        if (player.getDynamicProperty(punishmentProperty)) {
            clearPlayerInventory(player);
            player.setDynamicProperty(punishmentProperty, false); // Clear the punishment property after punishing the player
            alertNotice(player);
        }
    });

    // Event: When a projectile hits an entity
    projectileHitEntitySubscription = world.afterEvents.projectileHitEntity.subscribe((event) => {
        const attacker = event.source;
        const victim = event.getEntityHit().entity as Player;
        const projectileType = event.projectile.typeId;

        if (victim instanceof Player && projectileType === "minecraft:arrow") {
            handleArrowHit(victim);
        }

        if (attacker instanceof Player && victim instanceof Player) {
            handlePvP(attacker, victim);
        }
    });
}

/**
 * Unsubscribes from all PvP-related events.
 */
export function stopPvPSystem() {
    if (entityHitEntitySubscription) {
        world.afterEvents.entityHitEntity.unsubscribe(entityHitEntitySubscription);
        entityHitEntitySubscription = undefined;
    }

    if (playerLeaveSubscription) {
        world.beforeEvents.playerLeave.unsubscribe(playerLeaveSubscription);
        playerLeaveSubscription = undefined;
    }

    if (playerSpawnSubscription) {
        world.afterEvents.playerSpawn.unsubscribe(playerSpawnSubscription);
        playerSpawnSubscription = undefined;
    }

    if (projectileHitEntitySubscription) {
        world.afterEvents.projectileHitEntity.unsubscribe(projectileHitEntitySubscription);
        projectileHitEntitySubscription = undefined;
    }

    if (effectAddSubscription) {
        world.beforeEvents.effectAdd.unsubscribe(effectAddSubscription);
        effectAddSubscription = undefined;
    }
}

/**
 * Drops all items stored in the player data map for a given player.
 *
 * @param {string} playerId - The ID of the player whose data is to be dropped.
 */
async function dropStoredPlayerData(playerId: string) {
    const data = playerDataMap.get(playerId);

    if (!data) return; // Exit if no data found

    // Drop items from inventory and equipment
    system.run(() => {
        dropItems(data.inventory, data.dimension, data.location);
        dropItems(data.equipment, data.dimension, data.location);
    });

    // Remove data from the map
    playerDataMap.delete(playerId);
}

/**
 * Spawns items in the specified dimension at the given location.
 *
 * @param {ItemStack[]} items - An array of items to spawn.
 * @param {Dimension} dimension - The dimension where items will be spawned.
 * @param {Vector3} location - The location where items will be spawned.
 */
function dropItems(items: ItemStack[], dimension: Dimension, location: Vector3) {
    for (const itemStack of items) {
        if (itemStack) {
            dimension.spawnItem(itemStack, location);
        }
    }
}

/**
 * Clears all items in a player's inventory and equipment slots.
 * This function is typically called when a player rejoins after logging out during PvP.
 *
 * @param {Player} player - The player whose inventory and equipment will be cleared.
 */
function clearPlayerInventory(player: Player) {
    const inventory = player.getComponent("inventory")?.container;

    // Clear inventory items
    if (inventory) {
        for (let slot = 0; slot < inventory.size; slot++) {
            inventory.setItem(slot, undefined); // Clear the slot
        }
    }

    // Clear equipment items
    const equipmentComponent = player.getComponent(EntityEquippableComponent.componentId) as EntityEquippableComponent;
    if (equipmentComponent) {
        // Iterate over each equipment slot
        for (let slot of Object.values(EquipmentSlot)) {
            // Clear the slot
            equipmentComponent.setEquipment(slot, undefined);
        }
    }
}

/**
 * Handles the effects on a player when hit by an arrow.
 * @param {Player} victim - The player who was hit by the arrow.
 */
function handleArrowHit(victim: Player): void {
    const isPvPEnabledForVictim = victim.hasTag("paradoxBypassPvPCheck") ? false : (victim.getDynamicProperty(pvpStatusProperty) ?? world.gameRules.pvp);

    if (!isPvPEnabledForVictim) {
        removeNewEffects(victim);
    }
}

/**
 * Removes effects from the player that are not in the stored effects.
 * @param {Player} victim - The player whose effects need to be checked and potentially removed.
 */
function removeNewEffects(victim: Player): void {
    const currentEffects = victim.getEffects();
    const storedEffectsString = victim.getDynamicProperty("storedEffects") as string;

    let storedEffects: Effect[] = [];
    if (storedEffectsString) {
        storedEffects = JSON.parse(storedEffectsString);
    }

    const storedEffectsMap = new Map(storedEffects.map((effect) => [effect.typeId, effect]));

    currentEffects.forEach((effect) => {
        if (!storedEffectsMap.has(effect.typeId)) {
            victim.removeEffect(effect.typeId);
        }
    });
}

/**
 * Handles PvP logic when two players interact.
 * @param {Player} attacker - The player who is attacking.
 * @param {Player} victim - The player who is being attacked.
 */
function handlePvP(attacker: Player, victim: Player): void {
    const isPvPEnabledForVictim = victim.getDynamicProperty(pvpStatusProperty) ?? world.gameRules.pvp;

    // Bypass if they have the tag
    const bypass = victim.hasTag("paradoxBypassPvPCheck");

    if (bypass || !isPvPEnabledForVictim) {
        extinguishFireIfNecessary(victim);
        adjustHealth(attacker, victim);
    }

    if (!bypass) {
        enablePvPIfNeeded(attacker);
        updatePvPCooldown(attacker);
    }
}

/**
 * Extinguishes fire on the player if necessary.
 * @param {Player} victim - The player who may need to be extinguished.
 */
function extinguishFireIfNecessary(victim: Player): void {
    victim.extinguishFire(false);
}

/**
 * Adjusts health values between the attacker and the victim.
 * @param {Player} attacker - The player who is attacking.
 * @param {Player} victim - The player who is being attacked.
 */
function adjustHealth(attacker: Player, victim: Player): void {
    const healthComponentVictim = victim.getComponent("health");
    if (healthComponentVictim) {
        const beforeHealthVictim = victim.getDynamicProperty("paradoxCurrentHealth") as number;
        const currentHealthVictim = healthComponentVictim.currentValue;
        const healthDiffVictim = beforeHealthVictim - currentHealthVictim;
        const restoreHealthVictim = currentHealthVictim + healthDiffVictim;

        const healthComponentAttacker = attacker.getComponent("health");
        const pvpBypass = attacker.hasTag("paradoxBypassPvPCheck");
        if (!pvpBypass && healthComponentAttacker) {
            healthComponentAttacker.setCurrentValue(healthComponentAttacker.currentValue - healthDiffVictim);
        }

        healthComponentVictim.setCurrentValue(restoreHealthVictim);
    }
}

/**
 * Enables PvP for the attacker if it was previously disabled.
 * @param {Player} attacker - The player who is attacking.
 */
function enablePvPIfNeeded(attacker: Player): void {
    const isPvPEnabledForAttacker = attacker.getDynamicProperty(pvpStatusProperty) ?? world.gameRules.pvp;
    if (!isPvPEnabledForAttacker) {
        attacker.setDynamicProperty(pvpStatusProperty, true);
        attacker.sendMessage("§2[§7Paradox§2]§o§7 PvP has been enabled for you!");
        attacker.setDynamicProperty("pvpToggleCooldown", system.currentTick);
    }
}

/**
 * Updates the PvP cooldown for the attacker.
 * @param {Player} attacker - The player who is attacking.
 */
function updatePvPCooldown(attacker: Player): void {
    const currentTick = system.currentTick;
    const cooldownExpiryTick = currentTick + cooldownTicks;
    attacker.setDynamicProperty("pvpCooldown", cooldownExpiryTick);
}

/**
 * Updates the PvP cooldown ticks in memory based on the dynamic property `customPvPCooldown` in the world.
 *
 * This function retrieves the value of the `customPvPCooldown` property, which represents the PvP cooldown time in seconds,
 * and converts it to ticks (1 minute = 1200 ticks). If the property is not set, it defaults to 2400 ticks (2 minutes).
 *
 * It updates the global `cooldownTicks` variable, which is used throughout the system to handle PvP cooldown logic.
 *
 * @example
 * // Update the cooldown in memory whenever the property is modified
 * updateCoolDownTicks();
 *
 * @remarks
 * This function is called when the `customPvPCooldown` property is updated, so the `cooldownTicks` variable always reflects
 * the current value for the cooldown.
 */
export function updateCoolDownTicks() {
    cooldownTicks = (world.getDynamicProperty("customPvPCooldown") as number) ?? 2400;
}

/**
 * Initializes the PvP system by calling the internal setup function.
 * This function should be called from another script to enable PvP features.
 */
export function initializePvPSystem() {
    setupPvPSystem();
}

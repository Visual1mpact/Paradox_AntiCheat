import {
    Dimension,
    Effect,
    EffectAddBeforeEvent,
    EntityEquippableComponent,
    EntityHurtBeforeEvent,
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
import { PlayerCache } from "../classes/player-cache";
import { EventCoordinator } from "../classes/event-coordinator";

/** PvP cooldown in ticks (default 2 minutes = 2400 ticks) */
let cooldownTicks = 2400;

/** Dynamic property to track if a player should be punished for logging out */
const punishmentProperty = "pvpPunishment";

/** Dynamic property to track if a player has PvP enabled */
const pvpStatusProperty = "pvpEnabled";

/** Message cooldown to prevent spamming PvP warnings */
const messageCooldownTicks = 600;

/** Last message timestamp per player */
const playerMessageTimestamps = new Map<string, number>();

/** Interval ID for cleaning up expired PvP data */
let pvpCleanupIntervalId: number | undefined;

/** Event subscriptions */
let entityHurtSubscription: ((arg: EntityHurtBeforeEvent) => void) | undefined;
let playerLeaveSubscription: ((arg: PlayerLeaveBeforeEvent) => void) | undefined;
let playerSpawnSubscription: ((arg: PlayerSpawnAfterEvent) => void) | undefined;
let projectileHitEntitySubscription: ((arg: ProjectileHitEntityAfterEvent) => void) | undefined;
let effectAddSubscription: ((arg: EffectAddBeforeEvent) => void) | undefined;

/**
 * Stores player inventory, equipment, location, and dimension for combat logging purposes.
 * Keyed by player ID.
 */
const playerDataMap = new Map<
    string,
    {
        inventory: ItemStack[];
        equipment: ItemStack[];
        location: Vector3;
        dimension: Dimension;
    }
>();

/** ----------------------------- Utility Functions ----------------------------- */

/**
 * Converts seconds into a human-readable format: hours, minutes, seconds.
 */
function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    let formatted = "";
    if (hours > 0) formatted += `${hours} hour${hours > 1 ? "s" : ""}`;
    if (minutes > 0) formatted += (formatted ? " " : "") + `${minutes} minute${minutes > 1 ? "s" : ""}`;
    if (remainingSeconds > 0 || (hours === 0 && minutes === 0)) formatted += (formatted ? " " : "") + `${remainingSeconds} second${remainingSeconds > 1 ? "s" : ""}`;

    return formatted;
}

/**
 * Determines whether a message can be sent to a player based on cooldown.
 */
function canSendMessage(playerId: string): boolean {
    const currentTick = system.currentTick;
    const lastMessageTick = playerMessageTimestamps.get(playerId) ?? 0;

    if (currentTick - lastMessageTick >= messageCooldownTicks) {
        playerMessageTimestamps.set(playerId, currentTick);
        return true;
    }

    return false;
}

/**
 * Caches a player's inventory, equipment, location, and dimension for combat logging.
 */
function cachePlayerInventory(player: Player) {
    if (playerDataMap.has(player.id)) return;

    const inventoryComponent = player.getComponent("inventory")?.container;
    const equipmentComponent = player.getComponent("equippable");

    const inventoryItems: ItemStack[] = [];
    const equipmentItems: ItemStack[] = [];

    if (inventoryComponent) {
        for (let slot = 0; slot < inventoryComponent.size; slot++) {
            const item = inventoryComponent.getItem(slot);
            if (item) inventoryItems.push(item.clone());
        }
    }

    if (equipmentComponent) {
        for (const slot of Object.values(EquipmentSlot)) {
            if (slot === EquipmentSlot.Mainhand) continue;
            const item = equipmentComponent.getEquipment(slot);
            if (item) equipmentItems.push(item.clone());
        }
    }

    playerDataMap.set(player.id, {
        inventory: inventoryItems,
        equipment: equipmentItems,
        location: player.location,
        dimension: player.dimension,
    });
}

/**
 * Starts PvP combat cooldown for a player.
 */
function startCombat(player: Player) {
    const currentTick = system.currentTick;
    const cooldownEnd = currentTick + cooldownTicks;

    player.setDynamicProperty("pvpCooldown", cooldownEnd);

    if (canSendMessage(player.id)) {
        const remainingTime = formatTime(Math.floor(cooldownTicks / 20));
        player.sendMessage(`§2[§7Paradox§2]§o§7 You are in PvP combat! Logging out is disabled for ${remainingTime}.`);
    }

    system.runTimeout(() => {
        const p = PlayerCache.getPlayerById(player.id);
        if (!p) return;

        const storedCooldown = p.getDynamicProperty("pvpCooldown") as number;
        if (storedCooldown === cooldownEnd) {
            p.sendMessage("§2[§7Paradox§2]§o§7 Your PvP combat timer has expired. You may now safely log out.");
        }
    }, cooldownTicks);
}

/**
 * Restores health for a player if it has decreased from stored health.
 */
function restoreHealthIfNeeded(player: Player) {
    const health = player.getComponent("health");
    if (!health) return;

    const previous = (player.getDynamicProperty("paradoxCurrentHealth") as number) ?? health.currentValue;
    if (previous > health.currentValue) health.setCurrentValue(previous);
}

/**
 * Removes any newly applied effects not in storedEffects.
 */
function removeNewEffects(player: Player) {
    const currentEffects = player.getEffects();
    const storedEffectsString = player.getDynamicProperty("storedEffects") as string;

    let storedEffects: Effect[] = [];
    if (storedEffectsString) storedEffects = JSON.parse(storedEffectsString);

    const storedMap = new Map(storedEffects.map((e) => [e.typeId, e]));

    currentEffects.forEach((effect) => {
        if (!storedMap.has(effect.typeId)) player.removeEffect(effect.typeId);
    });
}

/** ----------------------------- Event Handlers ----------------------------- */

/**
 * Handles arrow/projectile hits on a player.
 */
function handleArrowHit(victim: Player) {
    const pvpEnabled = victim.hasTag("paradoxBypassPvPCheck") ? false : (victim.getDynamicProperty(pvpStatusProperty) ?? world.gameRules.pvp);

    if (!pvpEnabled) {
        restoreHealthIfNeeded(victim);
        removeNewEffects(victim);
    }
}

/**
 * Handles PvP interactions between attacker and victim.
 */
function handlePvP(attacker: Player, victim: Player) {
    const victimPvP = victim.getDynamicProperty(pvpStatusProperty) ?? world.gameRules.pvp;
    const bypass = victim.hasTag("paradoxBypassPvPCheck");

    if (bypass || !victimPvP) {
        victim.extinguishFire(false);
        restoreHealthIfNeeded(victim);

        const attackerHealth = attacker.getComponent("health");
        const damage = (victim.getDynamicProperty("paradoxCurrentHealth") as number) - (victim.getComponent("health")?.currentValue ?? 0);
        if (attackerHealth && damage) attackerHealth.setCurrentValue(Math.max(attackerHealth.currentValue - damage, 0));
    }

    if (!bypass) {
        enablePvPIfNeeded(attacker);
        startCombat(attacker);
    }
}

/**
 * Enables PvP for a player if it was previously disabled.
 */
function enablePvPIfNeeded(player: Player) {
    const enabled = player.getDynamicProperty(pvpStatusProperty) ?? world.gameRules.pvp;
    if (!enabled) {
        player.setDynamicProperty(pvpStatusProperty, true);
        player.sendMessage("§2[§7Paradox§2]§o§7 PvP has been enabled for you!");
        player.setDynamicProperty("pvpToggleCooldown", system.currentTick);
    }
}

/**
 * Clears a player's inventory and equipment.
 */
function clearPlayerInventory(player: Player) {
    const inv = player.getComponent("inventory")?.container;
    if (inv) for (let i = 0; i < inv.size; i++) inv.setItem(i, undefined);

    const equip = player.getComponent(EntityEquippableComponent.componentId) as EntityEquippableComponent;
    if (equip) for (const slot of Object.values(EquipmentSlot)) equip.setEquipment(slot, undefined);
}

/**
 * Drops all stored items for a player.
 */
function dropStoredPlayerData(playerId: string, playerName: string) {
    const data = playerDataMap.get(playerId);
    if (!data) return;

    system.run(() => {
        dropItems(data.inventory, data.dimension, data.location);
        dropItems(data.equipment, data.dimension, data.location);

        world.sendMessage(`§o§c[Paradox] ${playerName}§c logged out during combat! Their items were dropped.`);

        playerDataMap.delete(playerId);
    });
}

/**
 * Updates the PvP cooldown ticks in memory based on the world property `customPvPCooldown`.
 * Defaults to 2400 ticks (2 minutes) if the property is not set.
 */
export function updateCoolDownTicks() {
    cooldownTicks = (world.getDynamicProperty("customPvPCooldown") as number) ?? 2400;
}

/**
 * Spawns items in the world at a given location.
 */
function dropItems(items: ItemStack[], dimension: Dimension, location: Vector3) {
    for (const item of items) if (item) dimension.spawnItem(item, location);
}

/** ----------------------------- Initialization ----------------------------- */

/**
 * Initializes the PvP system by subscribing to events.
 */
export function initializePvPSystem() {
    if (!pvpCleanupIntervalId) {
        pvpCleanupIntervalId = system.runInterval(() => {
            const tick = system.currentTick;
            for (const [id] of playerDataMap.entries()) {
                const p = PlayerCache.getPlayerById(id);
                if (!p) playerDataMap.delete(id);
                else if ((p.getDynamicProperty("pvpCooldown") as number) <= tick) playerDataMap.delete(id);
            }
        }, 1200);
    }

    // Track effects for PvP-disabled players
    effectAddSubscription = (event) => {
        const ent = event.entity;
        if (!(ent instanceof Player)) return;
        ent.setDynamicProperty("storedEffects", JSON.stringify(ent.getEffects()));
    };
    EventCoordinator.subscribeBefore("effectAdd", effectAddSubscription);

    // PvP before-hurt handling
    entityHurtSubscription = (event) => {
        const victim = event.hurtEntity;
        const attacker = event.damageSource.damagingEntity;
        if (!(victim instanceof Player) || !(attacker instanceof Player)) return;

        const bypass = victim.hasTag("paradoxBypassPvPCheck");
        const pvpEnabled = victim.getDynamicProperty(pvpStatusProperty) ?? world.gameRules.pvp;

        if (bypass || !pvpEnabled) {
            event.cancel = true;
            cachePlayerInventory(attacker);
            startCombat(attacker);

            if (canSendMessage(attacker.id)) {
                attacker.sendMessage(bypass ? "§2[§7Paradox§2]§o§7 PvP disabled in this area." : `§2[§7Paradox§2]§o§7 ${victim.name} has PvP disabled!`);
            }
            return;
        }

        // PvP-enabled combat
        cachePlayerInventory(attacker);
        cachePlayerInventory(victim);
        startCombat(attacker);
        startCombat(victim);
    };
    EventCoordinator.subscribeBefore("entityHurt", entityHurtSubscription);

    // Player leaves
    playerLeaveSubscription = (event) => {
        const player = event.player;
        playerMessageTimestamps.delete(player.id);

        if (player.hasTag("paradoxBypassPvPCheck")) return;

        const cooldown = player.getDynamicProperty("pvpCooldown") as number;
        const tick = system.currentTick;

        if (cooldown && tick < cooldown) {
            player.setDynamicProperty(punishmentProperty, true);
            const saved = playerDataMap.get(player.id);
            if (saved) dropStoredPlayerData(player.id, player.name);
        } else {
            playerDataMap.delete(player.id);
        }
    };
    EventCoordinator.subscribeBefore("playerLeave", playerLeaveSubscription);

    // Player spawns
    playerSpawnSubscription = (event) => {
        const player = event.player;
        if (player.hasTag("paradoxBypassPvPCheck")) return;

        if (player.getDynamicProperty(punishmentProperty)) {
            clearPlayerInventory(player);
            player.setDynamicProperty(punishmentProperty, false);

            const alert = new MessageFormData();
            alert.title("               PvP Punishment").body("You have been punished for logging out during PvP! Your inventory and equipment has been wiped out!").button1("Quit").button2("Confirm").show(player);
        }
    };
    EventCoordinator.subscribeAfter("playerSpawn", playerSpawnSubscription);

    // Projectile hits
    projectileHitEntitySubscription = (event) => {
        const attacker = event.source;
        const victim = event.getEntityHit().entity as Player;
        const type = event.projectile.typeId;

        if (victim instanceof Player && type === "minecraft:arrow") handleArrowHit(victim);
        if (attacker instanceof Player && victim instanceof Player) handlePvP(attacker, victim);
    };
    EventCoordinator.subscribeAfter("projectileHitEntity", projectileHitEntitySubscription);
}

/**
 * Stops PvP system and unsubscribes all events.
 */
export function stopPvPSystem() {
    if (pvpCleanupIntervalId !== undefined) system.clearRun(pvpCleanupIntervalId);

    if (entityHurtSubscription) EventCoordinator.unsubscribeBefore("entityHurt", entityHurtSubscription);
    if (playerLeaveSubscription) EventCoordinator.unsubscribeBefore("playerLeave", playerLeaveSubscription);
    if (playerSpawnSubscription) EventCoordinator.unsubscribeAfter("playerSpawn", playerSpawnSubscription);
    if (projectileHitEntitySubscription) EventCoordinator.unsubscribeAfter("projectileHitEntity", projectileHitEntitySubscription);
    if (effectAddSubscription) EventCoordinator.unsubscribeBefore("effectAdd", effectAddSubscription);

    playerMessageTimestamps.clear();
    playerDataMap.clear();

    pvpCleanupIntervalId = undefined;
    entityHurtSubscription = undefined;
    playerLeaveSubscription = undefined;
    playerSpawnSubscription = undefined;
    projectileHitEntitySubscription = undefined;
    effectAddSubscription = undefined;
}

import { Dimension, EntityEquippableComponent, EntityHurtBeforeEvent, EquipmentSlot, ItemStack, Player, PlayerLeaveBeforeEvent, PlayerSpawnAfterEvent, ProjectileHitEntityAfterEvent, system, Vector3, world } from "@minecraft/server";
import { MessageFormData } from "@minecraft/server-ui";
import { PlayerCache } from "../classes/cache/player-cache";
import { PlayerLocationCache } from "../classes/cache/player-location-cache";
import { EventCoordinator } from "../classes/core/event-coordinator";

/** Configurable PvP action cooldown in ticks. Defaults to 2400 ticks (2 mins). */
let cooldownTicks = 2400;

/** Dynamic property key constants */
const DYNAMIC_PROP_PUNISHMENT = "pvpPunishment";
const DYNAMIC_PROP_PVP_STATUS = "pvpEnabled";
const DYNAMIC_PROP_COOLDOWN = "pvpCooldown";
const BYPASS_TAG = "paradoxBypassPvPCheck";

/** Message throttling parameters */
const MESSAGE_COOLDOWN_TICKS = 600;
const playerMessageTimestamps = new Map<string, number>();

/** System state handlers */
let pvpCleanupIntervalId: number | undefined;

/** Event listener subscription callbacks */
let entityHurtSub: ((arg: EntityHurtBeforeEvent) => void) | undefined;
let playerLeaveSub: ((arg: PlayerLeaveBeforeEvent) => void) | undefined;
let playerSpawnSub: ((arg: PlayerSpawnAfterEvent) => void) | undefined;
let projectileHitSub: ((arg: ProjectileHitEntityAfterEvent) => void) | undefined;

/** Stores inventory snapshots for combat logging. Keyed by Player ID (O(1) access). */
const playerDataMap = new Map<string, { inventory: ItemStack[]; equipment: ItemStack[]; location: Vector3; dimension: Dimension }>();

/**
 * Updates internal cooldown ticks from the dynamic property store.
 */
export function updateCoolDownTicks(): void {
    cooldownTicks = (world.getDynamicProperty("customPvPCooldown") as number) ?? 2400;
}

/**
 * Validates whether a message can be delivered to a player based on active throttle limits.
 *
 * @param {string} playerId - Target player identifier.
 * @returns {boolean} True if message delivery is permitted.
 */
function canSendMessage(playerId: string): boolean {
    const currentTick = system.currentTick;
    const lastTick = playerMessageTimestamps.get(playerId) ?? 0;
    if (currentTick - lastTick >= MESSAGE_COOLDOWN_TICKS) {
        playerMessageTimestamps.set(playerId, currentTick);
        return true;
    }
    return false;
}

/**
 * Caches player inventory, equipment, and transform data for combat logging mitigation.
 *
 * @param {Player} player - Target player entity.
 */
function cachePlayerInventory(player: Player): void {
    if (playerDataMap.has(player.id)) return;

    const inv = player.getComponent("inventory")?.container;
    const equip = player.getComponent("equippable");
    const inventoryItems: ItemStack[] = [];
    const equipmentItems: ItemStack[] = [];

    if (inv) {
        for (let i = 0; i < inv.size; i++) {
            const item = inv.getItem(i);
            if (item) inventoryItems.push(item.clone());
        }
    }

    if (equip) {
        for (const slot of Object.values(EquipmentSlot)) {
            if (slot === EquipmentSlot.Mainhand) continue;
            const item = equip.getEquipment(slot);
            if (item) equipmentItems.push(item.clone());
        }
    }

    const transform = PlayerLocationCache.getTransform(player);
    playerDataMap.set(player.id, {
        inventory: inventoryItems,
        equipment: equipmentItems,
        location: transform?.location ?? player.location,
        dimension: transform?.dimension ?? player.dimension,
    });
}

/**
 * Initiates combat cooldown for a specific player.
 *
 * @param {Player} player - Target player in combat.
 */
function startCombat(player: Player): void {
    const cooldownEnd = system.currentTick + cooldownTicks;
    player.setDynamicProperty(DYNAMIC_PROP_COOLDOWN, cooldownEnd);

    if (canSendMessage(player.id)) {
        player.sendMessage(`§2[§7Paradox§2]§o§7 You are in PvP combat! Logging out is disabled.`);
    }

    system.runTimeout(() => {
        const target = PlayerCache.getPlayerById(player.id);
        if (target && target.getDynamicProperty(DYNAMIC_PROP_COOLDOWN) === cooldownEnd) {
            target.sendMessage("§2[§7Paradox§2]§o§7 Your PvP combat timer has expired. You may now safely log out.");
        }
    }, cooldownTicks);
}

/**
 * Drops stored items into the world context upon combat logout.
 *
 * @param {ItemStack[]} items - Inventory items list.
 * @param {Dimension} dimension - Target dimension instance.
 * @param {Vector3} location - Spawn position coordinates.
 */
function dropItems(items: ItemStack[], dimension: Dimension, location: Vector3): void {
    for (const item of items) {
        if (item) dimension.spawnItem(item, location);
    }
}

/**
 * Processes inventory dropping procedures when a player combat logs.
 *
 * @param {string} playerId - Target player ID.
 * @param {string} playerName - Display name of player.
 */
function dropStoredPlayerData(playerId: string, playerName: string): void {
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
 * Clears player inventory containers upon login after a combat punishment flag is active.
 *
 * @param {Player} player - Executing target entity.
 */
function clearPlayerInventory(player: Player): void {
    const inv = player.getComponent("inventory")?.container;
    if (inv) {
        for (let i = 0; i < inv.size; i++) inv.setItem(i, undefined);
    }

    const equip = player.getComponent(EntityEquippableComponent.componentId) as EntityEquippableComponent;
    if (equip) {
        for (const slot of Object.values(EquipmentSlot)) equip.setEquipment(slot, undefined);
    }
}

/**
 * Evaluates PvP hurt rules and applies zero-damage cancellation when PvP is disabled.
 *
 * @param {EntityHurtBeforeEvent} event - Damage event context.
 */
function onEntityHurt(event: EntityHurtBeforeEvent): void {
    const victim = event.hurtEntity;
    const attacker = event.damageSource.damagingEntity;
    if (!(victim instanceof Player) || !(attacker instanceof Player)) return;

    const bypass = victim.hasTag(BYPASS_TAG);
    const pvpEnabled = (victim.getDynamicProperty(DYNAMIC_PROP_PVP_STATUS) as boolean) ?? world.gameRules.pvp;

    if (bypass || !pvpEnabled) {
        event.damage = 0;
        if (canSendMessage(attacker.id)) {
            attacker.sendMessage(bypass ? "§2[§7Paradox§2]§o§7 PvP is disabled in this area." : `§2[§7Paradox§2]§o§7 ${victim.name} has PvP disabled!`);
        }
        return;
    }

    cachePlayerInventory(attacker);
    cachePlayerInventory(victim);
    startCombat(attacker);
    startCombat(victim);
}

/**
 * Handles projectile-based combat initialization.
 *
 * @param {ProjectileHitEntityAfterEvent} event - Projectile hit event payload.
 */
function onProjectileHit(event: ProjectileHitEntityAfterEvent): void {
    const attacker = event.source;
    const victim = event.getEntityHit().entity;

    if (!(attacker instanceof Player) || !(victim instanceof Player)) return;
    if (victim.hasTag(BYPASS_TAG)) return;

    const pvpEnabled = (victim.getDynamicProperty(DYNAMIC_PROP_PVP_STATUS) as boolean) ?? world.gameRules.pvp;
    if (!pvpEnabled) return;

    cachePlayerInventory(attacker);
    cachePlayerInventory(victim);
    startCombat(attacker);
    startCombat(victim);
}

/**
 * Handles cleanup logic during player disconnect events.
 *
 * @param {PlayerLeaveBeforeEvent} event - Player leaving event context.
 */
function onPlayerLeave(event: PlayerLeaveBeforeEvent): void {
    const player = event.player;
    playerMessageTimestamps.delete(player.id);

    if (player.hasTag(BYPASS_TAG)) return;

    const cooldown = (player.getDynamicProperty(DYNAMIC_PROP_COOLDOWN) as number) ?? 0;
    if (cooldown && system.currentTick < cooldown) {
        player.setDynamicProperty(DYNAMIC_PROP_PUNISHMENT, true);
        dropStoredPlayerData(player.id, player.name);
    } else {
        playerDataMap.delete(player.id);
    }
}

/**
 * Handles player join events to enforce combat log punishments.
 *
 * @param {PlayerSpawnAfterEvent} event - Player spawn event context.
 */
function onPlayerSpawn(event: PlayerSpawnAfterEvent): void {
    const player = event.player;
    if (player.hasTag(BYPASS_TAG)) return;

    if (player.getDynamicProperty(DYNAMIC_PROP_PUNISHMENT)) {
        clearPlayerInventory(player);
        player.setDynamicProperty(DYNAMIC_PROP_PUNISHMENT, false);

        new MessageFormData().title("               PvP Punishment").body("You have been punished for logging out during PvP! Your inventory and equipment have been wiped out!").button1("Quit").button2("Confirm").show(player);
    }
}

/**
 * Initializes the PvP management system listeners and cleanup intervals.
 */
export function initializePvPSystem(): void {
    PlayerLocationCache.init();

    if (!pvpCleanupIntervalId) {
        pvpCleanupIntervalId = system.runInterval(() => {
            const currentTick = system.currentTick;
            for (const [id] of playerDataMap.entries()) {
                const player = PlayerCache.getPlayerById(id);
                if (!player || ((player.getDynamicProperty(DYNAMIC_PROP_COOLDOWN) as number) ?? 0) <= currentTick) {
                    playerDataMap.delete(id);
                }
            }
        }, 1200);
    }

    entityHurtSub = onEntityHurt;
    playerLeaveSub = onPlayerLeave;
    playerSpawnSub = onPlayerSpawn;
    projectileHitSub = onProjectileHit;

    EventCoordinator.subscribeBefore("entityHurt", entityHurtSub);
    EventCoordinator.subscribeBefore("playerLeave", playerLeaveSub);
    EventCoordinator.subscribeAfter("playerSpawn", playerSpawnSub);
    EventCoordinator.subscribeAfter("projectileHitEntity", projectileHitSub);
}

/**
 * De-initializes all system subscriptions and clears active runtime caches.
 */
export function stopPvPSystem(): void {
    if (pvpCleanupIntervalId !== undefined) system.clearRun(pvpCleanupIntervalId);

    if (entityHurtSub) EventCoordinator.unsubscribeBefore("entityHurt", entityHurtSub);
    if (playerLeaveSub) EventCoordinator.unsubscribeBefore("playerLeave", playerLeaveSub);
    if (playerSpawnSub) EventCoordinator.unsubscribeAfter("playerSpawn", playerSpawnSub);
    if (projectileHitSub) EventCoordinator.unsubscribeAfter("projectileHitEntity", projectileHitSub);

    playerMessageTimestamps.clear();
    playerDataMap.clear();

    pvpCleanupIntervalId = undefined;
    entityHurtSub = undefined;
    playerLeaveSub = undefined;
    playerSpawnSub = undefined;
    projectileHitSub = undefined;
}

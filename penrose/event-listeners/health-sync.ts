import { world, Player, EntityHealthChangedAfterEvent, EntityDieAfterEvent, PlayerSpawnAfterEvent } from "@minecraft/server";

/**
 * Synchronize the player's dynamic property "paradoxCurrentHealth" when their health changes.
 * @param player The player whose health needs to be synchronized.
 */
function initializePlayerHealth(player: Player): void {
    const healthComponent = player.getComponent("health");
    if (healthComponent) {
        const currentHealth = healthComponent.currentValue;
        const storedHealth = player.getDynamicProperty("paradoxCurrentHealth") as number;

        if (storedHealth === undefined || currentHealth !== storedHealth) {
            player.setDynamicProperty("paradoxCurrentHealth", currentHealth);
        }
    }
}

/**
 * Handle health change events to synchronize the player's health property.
 * @param event The event data containing health change information.
 */
function handleHealthChange(event: EntityHealthChangedAfterEvent): void {
    const entity = event.entity;
    if (entity instanceof Player) {
        const currentHealth = event.newValue;
        entity.setDynamicProperty("paradoxCurrentHealth", currentHealth);
    }
}

/**
 * Reset a player's dynamic health property to their default health value upon death.
 * @param event The event data triggered when an entity dies.
 */
function healthChangeAfterDeath(event: EntityDieAfterEvent): void {
    const entity = event.deadEntity;
    if (entity instanceof Player) {
        const defaultHealth = entity.isValid ? entity.getComponent("health")?.defaultValue : 20;
        entity.setDynamicProperty("paradoxCurrentHealth", defaultHealth);
    }
}

/**
 * Manages health-related event listeners, including initial spawn, health changes, and deaths.
 */
export const healthChangeListener = {
    /**
     * Indicates whether the health change listeners are currently active.
     */
    isActive: false,

    /**
     * Callback function for handling player spawn events.
     * @type {(event: PlayerSpawnAfterEvent) => void}
     */
    playerSpawnCallback: null as unknown as (event: PlayerSpawnAfterEvent) => void,

    /**
     * Callback function for handling health change events.
     * @type {(event: EntityHealthChangedAfterEvent) => void}
     */
    healthChangeCallback: null as unknown as (event: EntityHealthChangedAfterEvent) => void,

    /**
     * Callback function for handling health reset upon player death.
     * @type {(event: EntityDieAfterEvent) => void}
     */
    healthChangeAfterDeathCallback: null as unknown as (event: EntityDieAfterEvent) => void,

    /**
     * Start listening for player spawn and health change events.
     */
    start(): void {
        if (!this.isActive) {
            // Create and store the callback for player spawn
            this.playerSpawnCallback = (event: PlayerSpawnAfterEvent): void => {
                const player = event.player;
                if (event.initialSpawn) {
                    initializePlayerHealth(player);
                }
            };

            // Subscribe to player spawn events
            world.afterEvents.playerSpawn.subscribe(this.playerSpawnCallback);

            // Create and store the callback for health changes
            this.healthChangeCallback = handleHealthChange;

            // Create and store the callback for health changes after death
            this.healthChangeAfterDeathCallback = healthChangeAfterDeath;

            // Subscribe to health change events
            world.afterEvents.entityHealthChanged.subscribe(this.healthChangeCallback);

            // Subscribe to death events
            world.afterEvents.entityDie.subscribe(this.healthChangeAfterDeathCallback);

            this.isActive = true;
        }
    },

    /**
     * Stop listening for player spawn and health change events.
     */
    stop(): void {
        if (this.isActive) {
            // Unsubscribe from player spawn events
            if (this.playerSpawnCallback) {
                world.afterEvents.playerSpawn.unsubscribe(this.playerSpawnCallback);
                this.playerSpawnCallback = null;
            }

            // Unsubscribe from health change events
            if (this.healthChangeCallback) {
                world.afterEvents.entityHealthChanged.unsubscribe(this.healthChangeCallback);
                this.healthChangeCallback = null;
            }

            // Unsubscribe from death events
            if (this.healthChangeAfterDeathCallback) {
                world.afterEvents.entityDie.unsubscribe(this.healthChangeAfterDeathCallback);
                this.healthChangeAfterDeathCallback = null;
            }

            this.isActive = false;
        }
    },
};

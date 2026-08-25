import { world, system, Player, Direction, EntityDamageCause, GameMode, Dimension, EntityComponentTypes, EntityEquippableComponent, EquipmentSlot, ItemStack, ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";
import { ClaimData, Vector3D, RGBColor } from "../../classes/database/db-types";
import { landClaimsDB } from "../../event-listeners/world-initialize";
import { EventCoordinator } from "../../classes/core/event-coordinator";
import { PlayerLocationCache } from "../../classes/cache/player-location-cache";

// ==========================================
// TYPES & LOCAL DATA STRUCTURES
// ==========================================

/**
 * Tracks selection state during the 2-step wand interaction.
 */
interface SelectionState {
    dimensionId: string;
    pos1?: Vector3D;
    pos2?: Vector3D;
    timestamp: number;
}

/**
 * Active tracking state for dynamic gamemode enforcement on trespassers.
 */
interface DynamicTrackedPlayer {
    intervalId: number;
    originalGameMode: GameMode;
    claim: ClaimData;
}

// ==========================================
// SPATIAL UTILITIES
// ==========================================

/**
 * Converts continuous floating-point world coordinates into discrete block integer coordinates.
 *
 * @param p - Continuous 3D vector coordinate.
 * @returns Floored integer vector coordinate.
 */
function floorVec(p: Vector3D): Vector3D {
    return {
        x: Math.floor(p.x),
        y: Math.floor(p.y),
        z: Math.floor(p.z),
    };
}

/**
 * Calculates a unique 16x16 chunk identifier string while accounting for negative coordinates.
 *
 * @param x - Block X coordinate.
 * @param z - Block Z coordinate.
 * @returns Chunk key string formatted as "chunkX,chunkZ".
 */
function getChunkKey(x: number, z: number): string {
    return `${Math.floor(x / 16)},${Math.floor(z / 16)}`;
}

/**
 * Evaluates whether two 3D bounding boxes intersect or overlap.
 *
 * @param minA - Minimum bounds of box A.
 * @param maxA - Maximum bounds of box A.
 * @param minB - Minimum bounds of box B.
 * @param maxB - Maximum bounds of box B.
 * @returns `true` if the boxes intersect at any point; otherwise `false`.
 */
function doBoxesIntersect(minA: Vector3D, maxA: Vector3D, minB: Vector3D, maxB: Vector3D): boolean {
    return minA.x <= maxB.x && maxA.x >= minB.x && minA.y <= maxB.y && maxA.y >= minB.y && minA.z <= maxB.z && maxA.z >= minB.z;
}

/**
 * Determines whether a given 3D coordinate lies strictly within a bounding box.
 *
 * @param p - Point vector to check.
 * @param min - Minimum box boundary.
 * @param max - Maximum box boundary.
 * @returns `true` if the point is inside the box; otherwise `false`.
 */
function isPointInBox(p: Vector3D, min: Vector3D, max: Vector3D): boolean {
    return p.x >= min.x && p.x <= max.x && p.y >= min.y && p.y <= max.y && p.z >= min.z && p.z <= max.z;
}

/**
 * Checks if a point lies within a bounding box expanded by an outer margin/buffer.
 *
 * @param p - Point vector to evaluate.
 * @param min - Minimum box boundary.
 * @param max - Maximum box boundary.
 * @param buffer - Outer buffer distance in blocks.
 * @returns `true` if the point falls within the buffered region; otherwise `false`.
 */
function isPointInBoxWithBuffer(p: Vector3D, min: Vector3D, max: Vector3D, buffer: number): boolean {
    return p.x >= min.x - buffer && p.x <= max.x + buffer && p.y >= min.y - buffer && p.y <= max.y + buffer && p.z >= min.z - buffer && p.z <= max.z + buffer;
}

/**
 * Generates a randomized RGB color object with components between 0 and 255.
 *
 * @returns Randomized RGB color object.
 */
function getRandomRGBColor(): RGBColor {
    return {
        r: Math.floor(Math.random() * 256),
        g: Math.floor(Math.random() * 256),
        b: Math.floor(Math.random() * 256),
    };
}

/**
 * Maps an RGB color to the closest Minecraft raw chat formatting color prefix.
 *
 * @param color - RGB color components.
 * @returns Minecraft color code prefix (e.g., "§a").
 */
function getNearestMinecraftColorCode(color: RGBColor): string {
    const codes = [
        { code: "§c", r: 255, g: 85, b: 85 },
        { code: "§a", r: 85, g: 255, b: 85 },
        { code: "§9", r: 85, g: 85, b: 255 },
        { code: "§e", r: 255, g: 255, b: 85 },
        { code: "§d", r: 255, g: 85, b: 255 },
        { code: "§b", r: 85, g: 255, b: 255 },
        { code: "§6", r: 255, g: 170, b: 0 },
        { code: "§5", r: 170, g: 0, b: 170 },
    ];

    let minDistance = Infinity;
    let selectedCode = "§e";

    for (const c of codes) {
        const dist = Math.pow(color.r - c.r, 2) + Math.pow(color.g - c.g, 2) + Math.pow(color.b - c.b, 2);
        if (dist < minDistance) {
            minDistance = dist;
            selectedCode = c.code;
        }
    }
    return selectedCode;
}

// ==========================================
// LAND CLAIM MANAGER CLASS
// ==========================================

/**
 * Core manager responsible for persistent land claim storage, spatial chunk indexing,
 * boundary visualization, and event protection hooks.
 */
export class LandClaimManager {
    private static instance: LandClaimManager;

    // Fast spatial index: DimensionId -> ChunkKey -> Set of Claim IDs
    private chunkMap = new Map<string, Map<string, Set<string>>>();

    // In-memory claim cache: ClaimId -> ClaimData
    private claimsCache = new Map<string, ClaimData>();

    // Wand selection state cache keyed by Player ID
    private playerSelections = new Map<string, SelectionState>();

    // Concurrency guard lock for claim creation requests
    private pendingClaimLocks = new Set<string>();

    // Active tracking loops for trespassers forced into Adventure mode: Player UUID -> DynamicTrackedPlayer
    private trackedPlayers = new Map<string, DynamicTrackedPlayer>();

    public static readonly WAND_ITEM_ID = "minecraft:golden_hoe";
    public static readonly SELECTION_TIMEOUT_MS = 300000; // 5 minutes before active selection resets
    public static readonly BUFFER_EXIT_DISTANCE = 5; // Distance outside claim required to restore original gamemode
    public static readonly TRACKING_INTERVAL_TICKS = 10; // Location polling rate (~0.5s)

    private constructor() {
        PlayerLocationCache.init();
        this.registerEventHandlers();
    }

    /**
     * Gets or creates the singleton instance of LandClaimManager.
     *
     * @returns The active LandClaimManager instance.
     */
    public static getInstance(): LandClaimManager {
        if (!LandClaimManager.instance) {
            LandClaimManager.instance = new LandClaimManager();
        }
        return LandClaimManager.instance;
    }

    /**
     * Loads saved claims from persistent storage into memory and builds the spatial chunk index.
     */
    public async init(): Promise<void> {
        try {
            const entries = await landClaimsDB.entries();
            for (const [_, claim] of entries) {
                if (!claim.color) {
                    claim.color = getRandomRGBColor();
                }
                this.cacheClaim(claim);
            }
            console.warn(`[LandClaimManager] Initialized ${entries.length} claims safely.`);
        } catch (err) {
            console.warn("[LandClaimManager] Failed to load database:", err);
        }
    }

    // ==========================================
    // SPATIAL INDEXING & QUERIES
    // ==========================================

    /**
     * Registers a claim in memory and maps it to all intersecting 16x16 chunk buckets.
     *
     * @param claim - Claim data to cache.
     */
    private cacheClaim(claim: ClaimData): void {
        this.claimsCache.set(claim.id, claim);

        if (!this.chunkMap.has(claim.dimensionId)) {
            this.chunkMap.set(claim.dimensionId, new Map());
        }
        const dimMap = this.chunkMap.get(claim.dimensionId)!;

        const minChunkX = Math.floor(claim.min.x / 16);
        const maxChunkX = Math.floor(claim.max.x / 16);
        const minChunkZ = Math.floor(claim.min.z / 16);
        const maxChunkZ = Math.floor(claim.max.z / 16);

        for (let cx = minChunkX; cx <= maxChunkX; cx++) {
            for (let cz = minChunkZ; cz <= maxChunkZ; cz++) {
                const chunkKey = `${cx},${cz}`;
                if (!dimMap.has(chunkKey)) dimMap.set(chunkKey, new Set());
                dimMap.get(chunkKey)!.add(claim.id);
            }
        }
    }

    /**
     * Performs an O(1) spatial query to retrieve the claim occupying a specific location.
     *
     * @param pos - 3D world coordinate to check.
     * @param dimensionId - Dimension string identifier (e.g., "minecraft:overworld").
     * @returns The matching ClaimData if found; otherwise `undefined`.
     */
    public getClaimAt(pos: Vector3D, dimensionId: string): ClaimData | undefined {
        const floorPos = floorVec(pos);
        const dimMap = this.chunkMap.get(dimensionId);
        if (!dimMap) return undefined;

        const chunkKey = getChunkKey(floorPos.x, floorPos.z);
        const claimIds = dimMap.get(chunkKey);
        if (!claimIds) return undefined;

        for (const id of claimIds) {
            const claim = this.claimsCache.get(id);
            if (claim && isPointInBox(floorPos, claim.min, claim.max)) {
                return claim;
            }
        }
        return undefined;
    }

    /**
     * Retrieves all claims owned by a specific player UUID or ID.
     *
     * @param ownerUuid - Target player ID/UUID string.
     * @returns Array of ClaimData matching the owner.
     */
    public getClaimsByOwner(ownerUuid: string): ClaimData[] {
        const results: ClaimData[] = [];
        for (const claim of this.claimsCache.values()) {
            if (claim.ownerUuid === ownerUuid) {
                results.push(claim);
            }
        }
        return results;
    }

    /**
     * Retrieves a specific claim by its unique ID.
     *
     * @param claimId - The claim ID string.
     * @returns Target ClaimData if present; otherwise `undefined`.
     */
    public getClaimById(claimId: string): ClaimData | undefined {
        return this.claimsCache.get(claimId);
    }

    /**
     * Checks whether a proposed bounding box overlaps with any existing claims within local chunks.
     *
     * @param min - Minimum bound of proposed box.
     * @param max - Maximum bound of proposed box.
     * @param dimensionId - Dimension identifier string.
     * @returns `true` if an overlap exists; otherwise `false`.
     */
    private hasOverlap(min: Vector3D, max: Vector3D, dimensionId: string): boolean {
        const dimMap = this.chunkMap.get(dimensionId);
        if (!dimMap) return false;

        const minChunkX = Math.floor(min.x / 16);
        const maxChunkX = Math.floor(max.x / 16);
        const minChunkZ = Math.floor(min.z / 16);
        const maxChunkZ = Math.floor(max.z / 16);

        const checkedClaims = new Set<string>();

        for (let cx = minChunkX; cx <= maxChunkX; cx++) {
            for (let cz = minChunkZ; cz <= maxChunkZ; cz++) {
                const chunkKey = `${cx},${cz}`;
                const claimIds = dimMap.get(chunkKey);
                if (!claimIds) continue;

                for (const id of claimIds) {
                    if (checkedClaims.has(id)) continue;
                    checkedClaims.add(id);

                    const existing = this.claimsCache.get(id);
                    if (existing && doBoxesIntersect(min, max, existing.min, existing.max)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    // ==========================================
    // ARMOR STAND CORNER MARKERS
    // ==========================================

    /**
     * Spawns single armor stands placed directly on the blocks touched by the selection wand at the claim corners.
     *
     * @param dimension - World dimension to spawn entities in.
     * @param claim - Claim data used for color mapping.
     * @param pos1 - First corner block touched by the wand.
     * @param pos2 - Second corner block touched by the wand.
     * @returns Array of spawned armor stand entity UUIDs.
     */
    private spawnCornerArmorStands(dimension: Dimension, claim: ClaimData, pos1: Vector3D, pos2: Vector3D): string[] {
        const markerUuids: string[] = [];
        const colorCode = getNearestMinecraftColorCode(claim.color);

        const corners: Vector3D[] = [
            { x: claim.min.x + 0.5, y: pos1.y + 1, z: claim.min.z + 0.5 },
            { x: claim.max.x + 0.5, y: pos1.y + 1, z: claim.min.z + 0.5 },
            { x: claim.min.x + 0.5, y: pos2.y + 1, z: claim.max.z + 0.5 },
            { x: claim.max.x + 0.5, y: pos2.y + 1, z: claim.max.z + 0.5 },
        ];

        const leatherHelmet = new ItemStack("minecraft:leather_helmet", 1);
        const colorComp = leatherHelmet.getComponent("minecraft:color") as any;
        if (colorComp) {
            colorComp.color = {
                red: claim.color.r / 255,
                green: claim.color.g / 255,
                blue: claim.color.b / 255,
            };
        }

        for (const spawnPos of corners) {
            try {
                const armorStand = dimension.spawnEntity("minecraft:armor_stand", spawnPos);
                markerUuids.push(armorStand.id);

                armorStand.addTag("claim_corner_marker");
                armorStand.addTag(`claim_id:${claim.id}`);

                armorStand.nameTag = `${colorCode}█ Claim Corner`;

                const equippable = armorStand.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent;
                if (equippable) {
                    equippable.setEquipment(EquipmentSlot.Head, leatherHelmet);
                }
            } catch (err) {
                console.warn(`[LandClaimManager] Could not spawn armor stand marker at ${spawnPos.x}, ${spawnPos.y}, ${spawnPos.z}:`, err);
            }
        }

        return markerUuids;
    }

    /**
     * Removes all marker armor stands associated with a claim from the world.
     *
     * @param dimension - Dimension where marker entities reside.
     * @param claim - Target claim data.
     */
    private removeCornerArmorStands(dimension: Dimension, claim: ClaimData): void {
        const entities = dimension.getEntities({
            tags: [`claim_id:${claim.id}`],
        });

        for (const entity of entities) {
            try {
                entity.remove();
            } catch (err) {
                // Ignore removal errors for unloaded entities
            }
        }
    }

    // ==========================================
    // CLAIM MANAGEMENT API
    // ==========================================

    /**
     * Atomically creates a sky-to-bedrock land claim and places single armor stand corner markers directly on the clicked block locations.
     *
     * @param player - Player creating the claim.
     * @param p1 - First bounding corner vector.
     * @param p2 - Second bounding corner vector.
     * @returns `true` if creation succeeded; otherwise `false`.
     */
    public async createClaim(player: Player, p1: Vector3D, p2: Vector3D): Promise<boolean> {
        const lockKey = player.id;
        if (this.pendingClaimLocks.has(lockKey)) {
            player.sendMessage("§o§c[Paradox] Processing previous claim creation request...");
            return false;
        }

        this.pendingClaimLocks.add(lockKey);

        try {
            const transform = PlayerLocationCache.getTransform(player);
            const playerDimension = transform?.dimension ?? player.dimension;

            const fP1 = floorVec(p1);
            const fP2 = floorVec(p2);

            const min: Vector3D = {
                x: Math.min(fP1.x, fP2.x),
                y: -64,
                z: Math.min(fP1.z, fP2.z),
            };
            const max: Vector3D = {
                x: Math.max(fP1.x, fP2.x),
                y: 320,
                z: Math.max(fP1.z, fP2.z),
            };

            if (max.x - min.x + 1 < 10 || max.z - min.z + 1 < 10) {
                player.sendMessage("§o§c[Paradox] Claim too small! Minimum horizontal size is 10x10 blocks.");
                return false;
            }

            if (this.hasOverlap(min, max, playerDimension.id)) {
                player.sendMessage("§o§c[Paradox] Cannot claim: Selected area overlaps with an existing claim.");
                return false;
            }

            const claimId = `claim_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
            const claimColor = getRandomRGBColor();

            const claim: ClaimData = {
                id: claimId,
                ownerUuid: player.id,
                ownerName: player.name,
                dimensionId: playerDimension.id,
                min,
                max,
                members: [],
                created: Date.now(),
                color: claimColor,
            };

            const markerUuids = this.spawnCornerArmorStands(playerDimension, claim, fP1, fP2);
            claim.markerEntityUuids = markerUuids;

            this.cacheClaim(claim);
            await landClaimsDB.set(claimId, claim);

            player.sendMessage(`§2[§7Paradox§2]§o§7 Land successfully claimed! 4 corner markers placed on selected block coordinates. (ID: §a${claimId}§7)`);
            return true;
        } finally {
            this.pendingClaimLocks.delete(lockKey);
        }
    }

    /**
     * Deletes a claim, removes its spatial mapping, and cleans up entity markers.
     *
     * @param claimId - ID of claim to delete.
     * @returns `true` if claim existed and was removed; otherwise `false`.
     */
    public async deleteClaim(claimId: string): Promise<boolean> {
        const claim = this.claimsCache.get(claimId);
        if (!claim) return false;

        const dim = world.getDimension(claim.dimensionId);
        if (dim) {
            this.removeCornerArmorStands(dim, claim);
        }

        this.claimsCache.delete(claimId);
        await landClaimsDB.delete(claimId);
        return true;
    }

    /**
     * Checks if a player is authorized to modify or interact inside a claim.
     *
     * @param player - Target player.
     * @param claim - Target claim.
     * @returns `true` if player is owner or member; otherwise `false`.
     */
    public isAuthorized(player: Player, claim: ClaimData): boolean {
        return claim.ownerUuid === player.id || claim.members.includes(player.id);
    }

    /**
     * Converts a direction enum into a 3D unit direction offset.
     *
     * @param direction - Direction facing.
     * @returns Vector offset corresponding to specified direction.
     */
    private getDirectionOffset(direction: Direction): Vector3D {
        switch (direction) {
            case Direction.Down:
                return { x: 0, y: -1, z: 0 };
            case Direction.Up:
                return { x: 0, y: 1, z: 0 };
            case Direction.North:
                return { x: 0, y: 0, z: -1 };
            case Direction.South:
                return { x: 0, y: 0, z: 1 };
            case Direction.West:
                return { x: -1, y: 0, z: 0 };
            case Direction.East:
                return { x: 1, y: 0, z: 0 };
            default:
                return { x: 0, y: 0, z: 0 };
        }
    }

    // ==========================================
    // DYNAMIC GAMEMODE & TRACKING SAFEGUARDS
    // ==========================================

    /**
     * Forces an unauthorized player into Adventure mode while inside a claim and runs
     * a dynamic polling loop that restores their original gamemode upon exiting the buffer region.
     *
     * @param player - Trespassing player.
     * @param claim - Target claim being protected.
     */
    private enforceGamemodeSafeguard(player: Player, claim: ClaimData): void {
        if (this.trackedPlayers.has(player.id)) return;

        const originalGameMode = player.getGameMode() ?? GameMode.Survival;

        player.setGameMode(GameMode.Adventure);
        player.sendMessage("§o§c[Paradox] You have entered a protected claim. Gamemode set to Adventure.");

        const intervalId = system.runInterval(() => {
            const transform = PlayerLocationCache.getTransform(player);
            if (!transform) {
                this.stopTrackingPlayer(player.id);
                return;
            }

            const currentPos = floorVec(transform.location);
            const inSameDimension = transform.dimension.id === claim.dimensionId;

            const insideBuffer = inSameDimension && isPointInBoxWithBuffer(currentPos, claim.min, claim.max, LandClaimManager.BUFFER_EXIT_DISTANCE);

            if (!insideBuffer) {
                player.setGameMode(originalGameMode);
                player.sendMessage("§2[§7Paradox§2]§o§7 You left the protected land claim. Gamemode restored.");
                this.stopTrackingPlayer(player.id);
            }
        }, LandClaimManager.TRACKING_INTERVAL_TICKS);

        this.trackedPlayers.set(player.id, {
            intervalId,
            originalGameMode,
            claim,
        });
    }

    /**
     * Stops and clears tracking intervals for a given player ID.
     *
     * @param playerId - UUID string of player to stop tracking.
     */
    private stopTrackingPlayer(playerId: string): void {
        const tracking = this.trackedPlayers.get(playerId);
        if (tracking) {
            system.clearRun(tracking.intervalId);
            this.trackedPlayers.delete(playerId);
        }
    }

    // ==========================================
    // EVENT LISTENERS & PROTECTION LOGIC
    // ==========================================

    /**
     * Subscribes script handlers to world events for interdiction and claim protection.
     */
    private registerEventHandlers(): void {
        EventCoordinator.unsubscribeAfter("playerLeave", (ev) => {
            this.playerSelections.delete(ev.playerId);
            this.stopTrackingPlayer(ev.playerId);
        });

        // 1. Entity Damage Intercept
        EventCoordinator.subscribeBefore("entityHurt", (ev) => {
            const { hurtEntity, damageSource } = ev;

            // Protect corner marker armor stands from being destroyed
            if (hurtEntity.typeId === "minecraft:armor_stand" && hurtEntity.hasTag("claim_corner_marker")) {
                ev.cancel = true;
                const attacker = damageSource.damagingEntity;
                if (attacker instanceof Player) {
                    attacker.sendMessage("§o§c[Paradox] You cannot destroy claim corner markers.");
                }
                return;
            }

            const claim = this.getClaimAt(hurtEntity.location, hurtEntity.dimension.id);
            if (!claim) return;

            const attacker = damageSource.damagingEntity;
            if (attacker instanceof Player) {
                if (!this.isAuthorized(attacker, claim)) {
                    ev.cancel = true;
                    attacker.sendMessage("§o§c[Paradox] You cannot cause damage inside this protected claim.");
                    system.run(() => this.enforceGamemodeSafeguard(attacker, claim));
                }
            } else if (damageSource.cause === EntityDamageCause.blockExplosion || damageSource.cause === EntityDamageCause.entityExplosion) {
                ev.cancel = true;
            }
        });

        // 2. Wand Interaction, Block Right-Click & Bucket Liquid Interception
        EventCoordinator.subscribeBefore("playerInteractWithBlock", (ev) => {
            const { player, block, itemStack, blockFace } = ev;

            // Handle Selection Wand Clicks
            if (itemStack?.typeId === LandClaimManager.WAND_ITEM_ID) {
                ev.cancel = true;
                system.run(() => this.handleWandClick(player, block.location));
                return;
            }

            const transform = PlayerLocationCache.getTransform(player);
            const dimensionId = transform?.dimension.id ?? player.dimension.id;
            const currentClaim = this.getClaimAt(block.location, dimensionId);

            // Intercept Liquid Bucket Placement (Lava, Water, Powder Snow)
            const liquidBuckets = ["minecraft:lava_bucket", "minecraft:water_bucket", "minecraft:powder_snow_bucket"];
            if (itemStack && liquidBuckets.includes(itemStack.typeId)) {
                const pushOffset = this.getDirectionOffset(blockFace);
                const targetPos: Vector3D = {
                    x: block.location.x + pushOffset.x,
                    y: block.location.y + pushOffset.y,
                    z: block.location.z + pushOffset.z,
                };

                const targetClaim = this.getClaimAt(targetPos, dimensionId);

                // Cancel if trying to empty bucket into or targeted directly at an unauthorized claim
                if (targetClaim && !this.isAuthorized(player, targetClaim)) {
                    ev.cancel = true;
                    player.sendMessage("§o§c[Paradox] You cannot place liquids inside a protected land claim.");
                    system.run(() => this.enforceGamemodeSafeguard(player, targetClaim));
                    return;
                }
            }

            // Handle General Protected Claim Interactivity
            if (currentClaim && !this.isAuthorized(player, currentClaim)) {
                ev.cancel = true;
                player.sendMessage("§o§c[Paradox] You don't have permission to interact here.");
                system.run(() => this.enforceGamemodeSafeguard(player, currentClaim));
            }
        });

        // 3. Block Placement, Piston, & Redstone Safeguards
        EventCoordinator.subscribeBefore("playerPlaceBlock", (ev) => {
            const { player, block, face } = ev;
            const transform = PlayerLocationCache.getTransform(player);
            const dimId = transform?.dimension.id ?? player.dimension.id;
            const targetPos = block.location;

            const currentClaim = this.getClaimAt(targetPos, dimId);
            if (currentClaim && !this.isAuthorized(player, currentClaim)) {
                ev.cancel = true;
                player.sendMessage("§o§c[Paradox] You don't have permission to place blocks here.");
                system.run(() => this.enforceGamemodeSafeguard(player, currentClaim));
                return;
            }

            const itemTypeId = ev.permutationToPlace.type.id;
            if (!itemTypeId) return;

            // Piston push protection targeting unauthorized claims
            if (itemTypeId === "minecraft:piston" || itemTypeId === "minecraft:sticky_piston") {
                const pushOffset = this.getDirectionOffset(face);
                const projectedTarget: Vector3D = {
                    x: targetPos.x + pushOffset.x,
                    y: targetPos.y + pushOffset.y,
                    z: targetPos.z + pushOffset.z,
                };

                const pushClaim = this.getClaimAt(projectedTarget, dimId);
                if (pushClaim && !this.isAuthorized(player, pushClaim)) {
                    ev.cancel = true;
                    player.sendMessage("§o§c[Paradox] Cannot place piston facing into a protected land claim.");
                    system.run(() => this.enforceGamemodeSafeguard(player, pushClaim));
                    return;
                }
            }

            // Sticky block protection adjacent to unauthorized claims
            if (itemTypeId === "minecraft:slime" || itemTypeId === "minecraft:honey_block") {
                const adjacentDirections = [Direction.North, Direction.South, Direction.East, Direction.West, Direction.Up, Direction.Down];

                for (const dir of adjacentDirections) {
                    const offset = this.getDirectionOffset(dir);
                    const neighborPos: Vector3D = {
                        x: targetPos.x + offset.x,
                        y: targetPos.y + offset.y,
                        z: targetPos.z + offset.z,
                    };

                    const neighborClaim = this.getClaimAt(neighborPos, dimId);
                    if (neighborClaim && neighborClaim.id !== currentClaim?.id && !this.isAuthorized(player, neighborClaim)) {
                        ev.cancel = true;
                        player.sendMessage("§o§c[Paradox] Cannot place sticky blocks adjacent to an unauthorized land claim.");
                        system.run(() => this.enforceGamemodeSafeguard(player, neighborClaim));
                        return;
                    }
                }
            }
        });

        // 4. Block Break Protection
        EventCoordinator.subscribeBefore("playerBreakBlock", (ev) => {
            const transform = PlayerLocationCache.getTransform(ev.player);
            const dimId = transform?.dimension.id ?? ev.player.dimension.id;
            const claim = this.getClaimAt(ev.block.location, dimId);
            if (claim && !this.isAuthorized(ev.player, claim)) {
                ev.cancel = true;
                ev.player.sendMessage("§o§c[Paradox] You don't have permission to break blocks here.");
                system.run(() => this.enforceGamemodeSafeguard(ev.player, claim));
            }
        });

        // 5. Explosion Interception
        EventCoordinator.subscribeBefore("explosion", (ev) => {
            const dimId = ev.dimension.id;
            const safeBlocks = ev.getImpactedBlocks().filter((block) => {
                return this.getClaimAt(block.location, dimId) === undefined;
            });
            ev.setImpactedBlocks(safeBlocks);
        });
    }

    // ==========================================
    // SELECTION WAND HELPERS
    // ==========================================

    /**
     * Processes selection clicks using the wand tool to register two bounding corners.
     *
     * @param player - Player using the wand.
     * @param loc - Block location clicked.
     */
    private handleWandClick(player: Player, loc: Vector3D): void {
        const now = Date.now();
        let sel = this.playerSelections.get(player.id);
        const transform = PlayerLocationCache.getTransform(player);
        const currentDimensionId = transform?.dimension.id ?? player.dimension.id;

        if (!sel || now - sel.timestamp > LandClaimManager.SELECTION_TIMEOUT_MS || sel.dimensionId !== currentDimensionId) {
            sel = { dimensionId: currentDimensionId, timestamp: now };
            this.playerSelections.set(player.id, sel);
        }

        if (!sel.pos1) {
            sel.pos1 = floorVec(loc);
            sel.timestamp = now;
            player.sendMessage(`§2[§7Paradox§2]§o§7 Corner 1 set at (§a${sel.pos1.x}, ${sel.pos1.y}, ${sel.pos1.z}§7). Right-click Corner 2.`);
        } else {
            sel.pos2 = floorVec(loc);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Corner 2 set at (§a${sel.pos2.x}, ${sel.pos2.y}, ${sel.pos2.z}§7). Processing claim...`);

            const p1 = sel.pos1;
            const p2 = sel.pos2;
            this.playerSelections.delete(player.id);
            this.createClaim(player, p1, p2);
        }
    }
}

// Instantiate Singleton on Script Load
export const landClaims = LandClaimManager.getInstance();

// ==========================================
// COMMAND REGISTRATION & EXPORT
// ==========================================

/**
 * Command implementation for managing land claims (deleting, inspecting, and GUI integration).
 */
export const claimCommand: Command = {
    name: "landclaim",
    description: "Manage, inspect, and delete your registered land claims.",
    usage: "{prefix}claim <delete|list|info> [claimId]",
    examples: [`{prefix}claim delete claim_1700000000000_1234`, `{prefix}claim list`, `{prefix}claim info`],
    category: "Utility",
    securityClearance: 1,
    icon: "textures/items/gold_hoe.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Land Claim Management",
        /**
         * Description text for the Land Claim Management GUI form.
         * Displays interactive instructions, wand mechanics, protection details, and actions.
         */
        description:
            "§l§2Land Claim Management§r\n" +
            "§7Protect and manage your territories across dimensions.\n\n" +
            "§e§lWand Selection Setup:§r\n" +
            "§7• Hold a §aGolden Hoe§7 and right-click §fCorner 1§7.\n" +
            "§7• Right-click §fCorner 2§7 to set the opposite boundary.\n" +
            "§7• Claims extend automatically from sky to bedrock (§8-64 to 320§7).\n" +
            "§7• Minimum required claim area: §a10x10 blocks§7.\n\n" +
            "§e§lAvailable Menu Actions:§r\n" +
            "§7• §fClaim Info:§7 View owner, bounds, and member list for your current location.\n" +
            "§7• §fList My Claims:§7 Display all active land claims registered to your account.\n" +
            "§7• §fDelete Claim:§7 Remove an existing claim and clear its corner markers.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Claim Info",
                icon: "textures/ui/magnifying_glass.png",
                command: ["info"],
                description: "Inspect details of the claim you are currently standing in",
                requiredFields: [],
                generateModalForm: false,
            },
            {
                name: "List My Claims",
                icon: "textures/ui/world_glyph.png",
                command: ["list"],
                description: "Displays all claims owned by you",
                requiredFields: [],
                generateModalForm: false,
            },
            {
                name: "Delete Claim",
                icon: "textures/ui/cancel.png",
                command: ["delete"],
                description: "Deletes a specified land claim by its ID",
                requiredFields: ["claimId"],
                generateModalForm: true,
            },
        ],
        dynamicFields: [
            {
                name: "\nSelect Claim ID:",
                type: "dropdown",
                sourceType: "custom",
                requiredFields: ["claimId"],
            },
        ],
    },

    /**
     * Executes the claim command logic for chat and GUI interactions.
     *
     * @param message - The chat event payload.
     * @param args - Subcommands and optional target parameters.
     */
    execute: (message: ChatSendBeforeEvent | undefined, args?: string[]) => {
        if (!message || !args) {
            return;
        }

        const sender = message.sender;
        const manager = LandClaimManager.getInstance();

        const action = args[0]?.toLowerCase();
        const targetClaimId = args[1]?.trim();

        // Subcommand: LIST
        if (!action || action === "list") {
            const claims = manager.getClaimsByOwner(sender.id);

            if (claims.length === 0) {
                sender.sendMessage("§o§c[Paradox] You do not own any registered land claims.");
                return;
            }

            const listLines = [
                ` `,
                `§2[§7Paradox§2]§o§7 Your Registered Land Claims (${claims.length}):`,
                ...claims.map((claim, index) => {
                    const min = `${claim.min.x}, ${claim.min.z}`;
                    const max = `${claim.max.x}, ${claim.max.z}`;
                    return `  §o§7| §2[§f${index + 1}§2] §7ID: §a${claim.id} §7| Bounds: §e(${min}) §7to §e(${max})`;
                }),
                ` `,
            ];
            sender.sendMessage(listLines.join("\n"));
            return;
        }

        // Subcommand: DELETE
        if (action === "delete" || action === "remove") {
            if (!targetClaimId) {
                sender.sendMessage("§o§c[Paradox] Please provide a valid Claim ID to delete. Usage: {prefix}claim delete <claimId>");
                return;
            }

            const claim = manager.getClaimById(targetClaimId);

            if (!claim) {
                sender.sendMessage(`§o§c[Paradox] Claim "${targetClaimId}" could not be found.`);
                return;
            }

            if (claim.ownerUuid !== sender.id) {
                sender.sendMessage("§o§c[Paradox] You do not have permission to delete this claim.");
                return;
            }

            manager.deleteClaim(targetClaimId).then((success) => {
                if (success) {
                    sender.sendMessage(`§2[§7Paradox§2]§o§7 Successfully deleted land claim "§a${targetClaimId}§7". Corner markers removed.`);
                } else {
                    sender.sendMessage(`§o§c[Paradox] Failed to delete land claim "${targetClaimId}".`);
                }
            });
            return;
        }

        // Subcommand: INFO
        if (action === "info") {
            const transform = PlayerLocationCache.getTransform(sender);
            const senderLoc = transform?.location ?? sender.location;
            const senderDimId = transform?.dimension.id ?? sender.dimension.id;
            const currentClaim = manager.getClaimAt(senderLoc, senderDimId);

            if (!currentClaim) {
                sender.sendMessage("§o§c[Paradox] You are not currently standing inside a registered claim.");
                return;
            }

            const infoLines = [
                ` `,
                `§2[§7Paradox§2]§o§7 Current Land Claim Details:`,
                `  §o§7| §2ID: §f${currentClaim.id}`,
                `  §o§7| §2Owner: §f${currentClaim.ownerName}`,
                `  §o§7| §2Bounds: §f(${currentClaim.min.x}, ${currentClaim.min.z}) §7to §f(${currentClaim.max.x}, ${currentClaim.max.z})`,
                `  §o§7| §2Members: §f${currentClaim.members.length > 0 ? currentClaim.members.join(", ") : "None"}`,
                ` `,
            ];
            sender.sendMessage(infoLines.join("\n"));
            return;
        }

        sender.sendMessage("§o§c[Paradox] Unknown subcommand. Available subcommands: list, delete, info");
    },
};

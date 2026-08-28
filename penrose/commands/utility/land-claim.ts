import { world, system, Player, Direction, EntityDamageCause, GameMode, Dimension, EntityComponentTypes, EntityEquippableComponent, EquipmentSlot, ItemStack, ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";
import { ClaimData, Vector3D, RGBColor } from "../../classes/database/db-types";
import { landClaimsDB } from "../../event-listeners/world-initialize";
import { EventCoordinator } from "../../classes/core/event-coordinator";
import { PlayerLocationCache } from "../../classes/cache/player-location-cache";
import { PlayerCache } from "../../classes/cache/player-cache";

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
 * Validates whether a proposed claim size meets configured bounds.
 *
 * @param p1 - First corner vector.
 * @param p2 - Second corner vector.
 * @returns Object indicating validity status and descriptive error message if invalid.
 */
function validateClaimDimensions(p1: Vector3D, p2: Vector3D): { valid: boolean; error?: string } {
    const width = Math.abs(p1.x - p2.x) + 1;
    const length = Math.abs(p1.z - p2.z) + 1;
    const area = width * length;

    const config = LandClaimManager.config;

    if (width < config.MIN_SIZE || length < config.MIN_SIZE) {
        return { valid: false, error: `Selection too small! Minimum dimensions are ${config.MIN_SIZE}x${config.MIN_SIZE} blocks.` };
    }

    if (width > config.MAX_SIZE || length > config.MAX_SIZE) {
        return { valid: false, error: `Selection edge too long! Maximum edge length is ${config.MAX_SIZE} blocks.` };
    }

    if (area > config.MAX_AREA) {
        return { valid: false, error: `Total area (${area} blocks) exceeds maximum allowed limit of ${config.MAX_AREA} blocks.` };
    }

    return { valid: true };
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

    /**
     * Reads configuration limits for land claim sizing, allocations, and spatial buffers.
     * Dynamic getters fetch live values from world dynamic properties with default fallbacks safely at runtime.
     */
    public static get config() {
        return {
            /** Minimum horizontal edge length in blocks */
            get MIN_SIZE(): number {
                return (world.getDynamicProperty("claim_min_size") as number) ?? 10;
            },
            /** Maximum horizontal edge length in blocks */
            get MAX_SIZE(): number {
                return (world.getDynamicProperty("claim_max_size") as number) ?? 128;
            },
            /** Maximum total surface area footprint in blocks (X * Z) */
            get MAX_AREA(): number {
                return (world.getDynamicProperty("claim_max_area") as number) ?? 16384;
            },
            /** Maximum number of claims allowed per player */
            get MAX_CLAIMS_PER_PLAYER(): number {
                return (world.getDynamicProperty("claim_max_claims_per_player") as number) ?? 3;
            },
            /** Minimum block distance required between separate player claims */
            get CLAIM_BUFFER(): number {
                return (world.getDynamicProperty("claim_buffer") as number) ?? 5;
            },
        };
    }

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
     * Checks whether a proposed bounding box overlaps with existing claims or violates
     * the mandatory buffer distance against claims owned by other players.
     *
     * @param min - Minimum bound of proposed box.
     * @param max - Maximum bound of proposed box.
     * @param dimensionId - Dimension identifier string.
     * @param ownerUuid - UUID of player requesting claim creation.
     * @returns `true` if an overlap or buffer violation exists; otherwise `false`.
     */
    private hasOverlapOrBufferViolation(min: Vector3D, max: Vector3D, dimensionId: string, ownerUuid: string): boolean {
        const dimMap = this.chunkMap.get(dimensionId);
        if (!dimMap) return false;

        const buffer = LandClaimManager.config.CLAIM_BUFFER;
        const minChunkX = Math.floor((min.x - buffer) / 16);
        const maxChunkX = Math.floor((max.x + buffer) / 16);
        const minChunkZ = Math.floor((min.z - buffer) / 16);
        const maxChunkZ = Math.floor((max.z + buffer) / 16);

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
                    if (!existing) continue;

                    const isSameOwner = existing.ownerUuid === ownerUuid;

                    // 1. Direct Overlap Check (Applies to all players, including the same owner)
                    if (doBoxesIntersect(min, max, existing.min, existing.max)) {
                        return true;
                    }

                    // 2. Buffer Radius Check (Applies only to separate/unallied owners)
                    if (!isSameOwner) {
                        const bufferedMin: Vector3D = {
                            x: existing.min.x - buffer,
                            y: existing.min.y,
                            z: existing.min.z - buffer,
                        };
                        const bufferedMax: Vector3D = {
                            x: existing.max.x + buffer,
                            y: existing.max.y,
                            z: existing.max.z + buffer,
                        };

                        if (doBoxesIntersect(min, max, bufferedMin, bufferedMax)) {
                            return true;
                        }
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
        const colorComp = leatherHelmet.getComponent("minecraft:dyeable");

        if (colorComp && "color" in colorComp) {
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

        const config = LandClaimManager.config;

        // 1. Check max claims limit per player
        const existingClaims = this.getClaimsByOwner(player.id);
        if (existingClaims.length >= config.MAX_CLAIMS_PER_PLAYER) {
            player.sendMessage(`§o§c[Paradox] You have reached the maximum claim limit of ${config.MAX_CLAIMS_PER_PLAYER} claims.`);
            return false;
        }

        // 2. Validate claim dimensions and area rules
        const validation = validateClaimDimensions(p1, p2);
        if (!validation.valid) {
            player.sendMessage(`§o§c[Paradox] ${validation.error}`);
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

            // 3. Validate direct overlaps and spatial buffer distance constraints
            if (this.hasOverlapOrBufferViolation(min, max, playerDimension.id, player.id)) {
                player.sendMessage(`§o§c[Paradox] Cannot claim: Selected area overlaps with an existing claim or is within ${config.CLAIM_BUFFER} blocks of another player's territory.`);
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
     * Adds a trusted member to an existing claim.
     *
     * @param claimId - ID of claim to update.
     * @param memberIdentifier - Target player ID/UUID or name to trust.
     * @returns `true` if member was successfully added; otherwise `false`.
     */
    public async addMember(claimId: string, memberIdentifier: string): Promise<boolean> {
        const claim = this.claimsCache.get(claimId);
        if (!claim) return false;

        if (!claim.members.includes(memberIdentifier)) {
            claim.members.push(memberIdentifier);
            await landClaimsDB.set(claimId, claim);
        }
        return true;
    }

    /**
     * Removes a trusted member from an existing claim.
     *
     * @param claimId - ID of claim to update.
     * @param memberIdentifier - Target player ID/UUID or name to untrust.
     * @returns `true` if member was found and removed; otherwise `false`.
     */
    public async removeMember(claimId: string, memberIdentifier: string): Promise<boolean> {
        const claim = this.claimsCache.get(claimId);
        if (!claim) return false;

        const index = claim.members.indexOf(memberIdentifier);
        if (index !== -1) {
            claim.members.splice(index, 1);
            await landClaimsDB.set(claimId, claim);
            return true;
        }
        return false;
    }

    /**
     * Checks if a player is authorized to modify or interact inside a claim.
     *
     * @param player - Target player.
     * @param claim - Target claim.
     * @returns `true` if player is owner or member; otherwise `false`.
     */
    public isAuthorized(player: Player, claim: ClaimData): boolean {
        return claim.ownerUuid === player.id || claim.members.includes(player.id) || claim.members.includes(player.name);
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

            const claim = this.getClaimAt(hurtEntity.location, hurtEntity.dimension.id);
            if (!claim) return;

            const attacker = damageSource.damagingEntity;

            // Scenario A: Player is attacking an entity inside a claim
            if (attacker instanceof Player) {
                // Deny damage ONLY if the attacking player is NOT authorized on this claim
                if (!this.isAuthorized(attacker, claim)) {
                    ev.cancel = true;
                    attacker.sendMessage("§o§c[Paradox] You cannot cause damage inside this protected claim.");
                    system.run(() => this.enforceGamemodeSafeguard(attacker, claim));
                }
                // Authorized owners/members bypass this check and can freely hurt mobs/animals on their land.
                return;
            }

            // Scenario B: Mobs/Entities attacking a player on claimed land
            if (hurtEntity instanceof Player && this.isAuthorized(hurtEntity, claim)) {
                // Cancel damage dealt to authorized claim members by external mobs/entities
                ev.cancel = true;
                return;
            }

            // Scenario C: Explosions harming entities/mobs/players inside claims
            if (damageSource.cause === EntityDamageCause.blockExplosion || damageSource.cause === EntityDamageCause.entityExplosion) {
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

/**
 * Helper to handle the 'config' subcommand.
 */
function handleConfigCommand(sender: Player, args: string[]): void {
    const param = args[1]?.toLowerCase();
    const valStr = args[2];

    if (param === "reset") {
        world.setDynamicProperty("claim_min_size", undefined);
        world.setDynamicProperty("claim_max_size", undefined);
        world.setDynamicProperty("claim_max_area", undefined);
        world.setDynamicProperty("claim_max_claims_per_player", undefined);
        world.setDynamicProperty("claim_buffer", undefined);
        sender.sendMessage("§2[§7Paradox§2]§o§7 All land claim configuration parameters have been reset to default values.");
        return;
    }

    if (!param || !valStr) {
        sender.sendMessage("§o§c[Paradox] Usage: {prefix}landclaim config <min_size|max_size|max_area|max_claims|buffer|reset> <value>");
        return;
    }

    const newValue = parseInt(valStr, 10);
    if (isNaN(newValue) || newValue < 0) {
        sender.sendMessage("§o§c[Paradox] Config value must be a non-negative integer.");
        return;
    }

    const keyMap: Record<string, { property: string; label: string }> = {
        min_size: { property: "claim_min_size", label: "MIN_SIZE" },
        minsize: { property: "claim_min_size", label: "MIN_SIZE" },
        max_size: { property: "claim_max_size", label: "MAX_SIZE" },
        maxsize: { property: "claim_max_size", label: "MAX_SIZE" },
        max_area: { property: "claim_max_area", label: "MAX_AREA" },
        maxarea: { property: "claim_max_area", label: "MAX_AREA" },
        max_claims: { property: "claim_max_claims_per_player", label: "MAX_CLAIMS_PER_PLAYER" },
        maxclaims: { property: "claim_max_claims_per_player", label: "MAX_CLAIMS_PER_PLAYER" },
        buffer: { property: "claim_buffer", label: "CLAIM_BUFFER" },
        claim_buffer: { property: "claim_buffer", label: "CLAIM_BUFFER" },
    };

    const target = keyMap[param];
    if (target) {
        world.setDynamicProperty(target.property, newValue);
        sender.sendMessage(`§2[§7Paradox§2]§o§7 Updated ${target.label} to §a${newValue}§7.`);
    } else {
        sender.sendMessage("§o§c[Paradox] Invalid config key. Valid keys: min_size, max_size, max_area, max_claims, buffer, reset");
    }
}

/**
 * Helper to handle the 'online' subcommand.
 */
function handleOnlineCommand(sender: Player, manager: LandClaimManager): void {
    const activePlayers = PlayerCache.getAllPlayers();
    if (activePlayers.length === 0) {
        sender.sendMessage("§o§c[Paradox] No active players currently connected.");
        return;
    }

    let totalActiveClaims = 0;
    const lines: string[] = [` `, `§2[§7Paradox§2]§o§7 Active Claims (Online Players: §a${activePlayers.length}§7):`];

    for (const p of activePlayers) {
        const pClaims = manager.getClaimsByOwner(p.id);
        if (pClaims.length > 0) {
            lines.push(`  §2• §f${p.name} §7(§a${pClaims.length} claim(s)§7):`);
            for (const c of pClaims) {
                totalActiveClaims++;
                const dimName = c.dimensionId.replace("minecraft:", "");
                lines.push(`    §o§7- ID: §a${c.id} §7| Dim: §e${dimName} §7| Bounds: §e(${c.min.x},${c.min.z}) §7to §e(${c.max.x},${c.max.z})`);
            }
        }
    }

    if (totalActiveClaims === 0) {
        sender.sendMessage("§o§c[Paradox] No land claims found for currently online players.");
        return;
    }

    lines.push(` `);
    const CHUNK_SIZE = 8;
    for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
        sender.sendMessage(lines.slice(i, i + CHUNK_SIZE).join("\n"));
    }
}

/**
 * Helper to handle the 'list' subcommand.
 */
function handleListCommand(sender: Player, manager: LandClaimManager, isAdmin: boolean, targetArg?: string): void {
    let targetId = sender.id;
    let targetName = sender.name;

    if (targetArg) {
        const targetOnlinePlayer = PlayerCache.getAllPlayers().find((p) => p.name.toLowerCase() === targetArg.toLowerCase() || p.id === targetArg);

        if (targetOnlinePlayer) {
            targetId = targetOnlinePlayer.id;
            targetName = targetOnlinePlayer.name;
        } else if (isAdmin) {
            targetId = targetArg;
            targetName = targetArg;
        } else {
            sender.sendMessage(`§o§c[Paradox] Player "${targetArg}" is not online.`);
            return;
        }
    }

    const claims = manager.getClaimsByOwner(targetId);
    if (claims.length === 0) {
        sender.sendMessage(targetId === sender.id ? "§o§c[Paradox] You do not own any registered land claims." : `§o§c[Paradox] No active land claims found for player "${targetName}".`);
        return;
    }

    const isSelf = targetId === sender.id;
    const title = isSelf ? `Your Registered Land Claims (${claims.length}/${LandClaimManager.config.MAX_CLAIMS_PER_PLAYER})` : `Registered Land Claims for ${targetName} (${claims.length})`;

    const listLines = [
        ` `,
        `§2[§7Paradox§2]§o§7 ${title}:`,
        ...claims.map((claim, index) => {
            const min = `${claim.min.x}, ${claim.min.z}`;
            const max = `${claim.max.x}, ${claim.max.z}`;
            const dimName = claim.dimensionId.replace("minecraft:", "");
            return `  §o§7| §2[§f${index + 1}§2] §7ID: §a${claim.id} §7| Dim: §e${dimName} §7| Bounds: §e(${min}) §7to §e(${max})`;
        }),
        ` `,
    ];
    sender.sendMessage(listLines.join("\n"));
}

/**
 * Helper to handle 'trust' and 'untrust' member operations.
 */
async function handleTrustCommand(sender: Player, manager: LandClaimManager, isAdmin: boolean, isTrust: boolean, targetClaimId?: string, targetPlayer?: string): Promise<void> {
    const actionName = isTrust ? "trust" : "untrust";
    if (!targetClaimId || !targetPlayer) {
        sender.sendMessage(`§o§c[Paradox] Please provide a Claim ID and player name/ID. Usage: {prefix}landclaim ${actionName} <claimId> <player>`);
        return;
    }

    const claim = manager.getClaimById(targetClaimId);
    if (!claim) {
        sender.sendMessage(`§o§c[Paradox] Claim "${targetClaimId}" could not be found.`);
        return;
    }

    if (claim.ownerUuid !== sender.id && !isAdmin) {
        sender.sendMessage("§o§c[Paradox] You do not have permission to manage members for this claim.");
        return;
    }

    const targetOnlinePlayer = PlayerCache.getAllPlayers().find((p) => p.name.toLowerCase() === targetPlayer.toLowerCase() || p.id === targetPlayer);

    if (isTrust) {
        const memberIdToSave = targetOnlinePlayer ? targetOnlinePlayer.id : targetPlayer;
        const success = await manager.addMember(targetClaimId, memberIdToSave);
        sender.sendMessage(success ? `§2[§7Paradox§2]§o§7 Successfully trusted player "§a${targetPlayer}§7" on claim "§a${targetClaimId}§7".` : `§o§c[Paradox] Failed to add member to claim "${targetClaimId}".`);
    } else {
        const memberIdToRemove = targetOnlinePlayer && claim.members.includes(targetOnlinePlayer.id) ? targetOnlinePlayer.id : targetPlayer;
        const success = await manager.removeMember(targetClaimId, memberIdToRemove);
        sender.sendMessage(
            success ? `§2[§7Paradox§2]§o§7 Successfully untrusted player "§a${targetPlayer}§7" from claim "§a${targetClaimId}§7".` : `§o§c[Paradox] Player "${targetPlayer}" is not listed as a trusted member of claim "${targetClaimId}".`
        );
    }
}

/**
 * Helper to handle the 'delete' subcommand.
 */
async function handleDeleteCommand(sender: Player, manager: LandClaimManager, isAdmin: boolean, targetClaimId?: string): Promise<void> {
    if (!targetClaimId) {
        sender.sendMessage("§o§c[Paradox] Please provide a valid Claim ID to delete. Usage: {prefix}landclaim delete <claimId>");
        return;
    }

    const claim = manager.getClaimById(targetClaimId);
    if (!claim) {
        sender.sendMessage(`§o§c[Paradox] Claim "${targetClaimId}" could not be found.`);
        return;
    }

    if (claim.ownerUuid !== sender.id && !isAdmin) {
        sender.sendMessage("§o§c[Paradox] You do not have permission to delete this claim.");
        return;
    }

    const success = await manager.deleteClaim(targetClaimId);
    sender.sendMessage(success ? `§2[§7Paradox§2]§o§7 Successfully deleted land claim "§a${targetClaimId}§7". Corner markers removed.` : `§o§c[Paradox] Failed to delete land claim "${targetClaimId}".`);
}

/**
 * Helper to handle the 'info' subcommand.
 */
function handleInfoCommand(sender: Player, manager: LandClaimManager): void {
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
}

// ==========================================
// COMMAND REGISTRATION & EXPORT
// ==========================================

/**
 * Command implementation for managing land claims (deleting, inspecting, member management, reconfiguration, and GUI integration).
 */
export const claimCommand: Command = {
    name: "landclaim",
    description: "Manage, inspect, and configure access or limits for registered land claims.",
    usage: "{prefix}landclaim <delete|list|online|info|trust|untrust|config> [targetPlayer|claimId] [value]",
    /**
     * Command usage examples demonstrating player operations and administrative commands.
     * Supports placeholder replacement for dynamic system prefixes.
     */
    examples: [
        // --- Member & Permission Management ---
        /** Grant full interaction/build rights to a target player via Claim ID */
        `{prefix}landclaim trust claim_1700000000000_1234 Steve`,
        /** Revoke interaction/build rights from a target player via Claim ID */
        `{prefix}landclaim untrust claim_1700000000000_1234 Steve`,

        // --- Claim Lifecycle & Inspection Commands ---
        /** Permanently delete a claim and unregister its physical boundaries */
        `{prefix}landclaim delete claim_1700000000000_1234`,
        /** Display an itemized list of your registered claims with coordinates */
        `{prefix}landclaim list`,
        /** Inspect registered claims for a specific online or target player */
        `{prefix}landclaim list Steve`,
        /** View claims owned by all currently connected online players (Admin only) */
        `{prefix}landclaim online`,
        /** Inspect metadata, owner, and trusted members of the claim at your current position */
        `{prefix}landclaim info`,

        // --- Administrative & Runtime Configuration ---
        /** Set maximum allowable claims per player (Admin only) */
        `{prefix}landclaim config max_claims 5`,
        /** Set minimum allowable claim size in blocks (e.g., 10x10) (Admin only) */
        `{prefix}landclaim config min_size 10`,
        /** Set required buffer distance between neighboring claims in blocks (Admin only) */
        `{prefix}landclaim config claim_buffer 5`,
        /** Reset all land claim configuration variables to global default values (Admin only) */
        `{prefix}landclaim config reset`,
    ],
    category: "Utility",
    securityClearance: 1,
    icon: "textures/items/gold_hoe.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Land Claim Management",
        /**
         * Dynamic getter for the Land Claim command description and UI documentation.
         * Pulls active configuration limits from `LandClaimManager` to render accurate,
         * real-time player guidance and administrative privileges.
         *
         * @returns {string} Formatted Minecraft color-coded UI description string.
         */
        get description(): string {
            const config = LandClaimManager.config;
            return (
                "§l§2Land Claim Management§r\n" +
                "§7Protect and manage your personal and faction territories across dimensions.\n\n" +
                "§e§lWand Selection Setup:§r\n" +
                "§7• Hold a §aGolden Hoe§7 and right-click §fCorner 1§7 to place the primary anchor.\n" +
                "§7• Right-click §fCorner 2§7 to set the diagonal opposite boundary.\n" +
                "§7• Claims extend automatically vertically from sky to bedrock (§8-64 to 320§7).\n" +
                `§7• Minimum area: §a${config.MIN_SIZE}x${config.MIN_SIZE} blocks§7 (smaller areas rejected).\n` +
                `§7• Player limit: §aMax ${config.MAX_CLAIMS_PER_PLAYER} active claims§7 per player.\n` +
                `§7• Border buffer: Must maintain a §a${config.CLAIM_BUFFER || 5}-block buffer§7 from adjacent claims.\n\n` +
                "§e§lAvailable Menu Actions:§r\n" +
                "§7• §fClaim Info:§7 View details (Owner, UUID/ID, exact coordinates, member permissions) for your location.\n" +
                "§7• §fList My Claims:§7 Display all active land claims, world dimensions, and teleport markers registered to you.\n" +
                "§7• §fTrust Member:§7 Grant interact, build, container, and entity access permissions to a specified player.\n" +
                "§7• §fUntrust Member:§7 Immediately revoke all claim access and interaction permissions from a trusted user.\n" +
                "§7• §fDelete Claim:§7 Permanently abandon an existing claim, release territory, and clear its corner markers.\n" +
                "§7• §fReconfigure Settings:§7 Modify runtime claim sizing, buffer zones, and player quotas (Requires Level 4 clearance).\n\n" +
                "§c§lAdmin Overrides (Clearance Level 4+):§r\n" +
                "§7• Admins can trust/untrust members on or delete claims owned by other players.\n" +
                "§7• View active claims for all online players using the online subcommand.\n\n"
            );
        },
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
                name: "List Online Player Claims",
                icon: "textures/ui/multiplayer_glyph.png",
                securityClearance: 4,
                command: ["online"],
                description: "Displays land claims owned strictly by currently connected players (Admin only)",
                requiredFields: [],
                generateModalForm: false,
            },
            {
                name: "Trust Member",
                icon: "textures/ui/icon_multiplayer.png",
                command: ["trust"],
                description: "Grant full interaction rights to a player in your claim",
                requiredFields: ["claimId", "targetPlayer"],
                generateModalForm: true,
            },
            {
                name: "Untrust Member",
                icon: "textures/ui/bad_omen_effect.png",
                command: ["untrust"],
                description: "Revoke interaction rights from a player in your claim",
                requiredFields: ["claimId", "targetPlayer"],
                generateModalForm: true,
            },
            {
                name: "Delete Claim",
                icon: "textures/ui/cancel.png",
                command: ["delete"],
                description: "Deletes a specified land claim by its ID",
                requiredFields: ["claimId"],
                generateModalForm: true,
            },
            {
                name: "Reconfigure Claim Settings",
                icon: "textures/ui/gear.png",
                description: "Reconfigure land claim limits and spatial buffers (admin only).",
                securityClearance: 4,
                command: ["config"],
                requiredFields: ["configKey", "configValue"],
                generateModalForm: true,
            },
            {
                name: "Reset Config Settings",
                icon: "textures/ui/backup_replace.png",
                description: "Reset claim config parameters back to default values (admin only).",
                securityClearance: 4,
                command: ["config", "reset"],
                generateModalForm: false,
            },
        ],
        dynamicFields: [
            {
                name: "\nSelect Claim ID:",
                type: "dropdown",
                sourceType: "custom",
                requiredFields: ["claimId"],
            },
            {
                name: "Target Player Name / ID:",
                type: "text",
                placeholder: "e.g., Steve",
                requiredFields: ["targetPlayer"],
            },
            {
                name: "\nConfig Parameter:",
                type: "dropdown",
                sourceType: "custom",
                options: ["min_size", "max_size", "max_area", "max_claims", "buffer"],
                requiredFields: ["configKey"],
            },
            {
                name: "New Integer Value:",
                type: "text",
                placeholder: "e.g., 10",
                requiredFields: ["configValue"],
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

        const senderClearance = (sender.getDynamicProperty("securityClearance") as number) ?? 1;
        const isAdmin = senderClearance >= 4;

        switch (action) {
            case "config":
                if (!isAdmin) {
                    sender.sendMessage("§o§c[Paradox] You do not have permission to reconfigure land claim parameters.");
                    return;
                }
                handleConfigCommand(sender, args);
                break;

            case "online":
            case "onlineclaims":
                if (!isAdmin) {
                    sender.sendMessage("§o§c[Paradox] You do not have clearance to inspect claims of online players.");
                    return;
                }
                handleOnlineCommand(sender, manager);
                break;

            case "":
            case undefined:
            case "list":
                handleListCommand(sender, manager, isAdmin, args[1]?.trim());
                break;

            case "trust":
            case "add":
                handleTrustCommand(sender, manager, isAdmin, true, args[1]?.trim(), args[2]?.trim());
                break;

            case "untrust":
            case "unadd":
                handleTrustCommand(sender, manager, isAdmin, false, args[1]?.trim(), args[2]?.trim());
                break;

            case "delete":
            case "remove":
                handleDeleteCommand(sender, manager, isAdmin, args[1]?.trim());
                break;

            case "info":
                handleInfoCommand(sender, manager);
                break;

            default:
                sender.sendMessage("§o§c[Paradox] Unknown subcommand. Available subcommands: list, online, trust, untrust, delete, info, config");
                break;
        }
    },
};

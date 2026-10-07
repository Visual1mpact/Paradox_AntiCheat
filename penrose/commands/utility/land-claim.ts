import { world, system, Player, Direction, EntityDamageCause, GameMode, Dimension, EntityComponentTypes, EntityEquippableComponent, EquipmentSlot, ItemStack, ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";
import { ClaimData, Vector3D, RGBColor } from "../../types/db-types";
import { landClaimsDB } from "../../event-listeners/world-initialize";
import { EventCoordinator } from "../../classes/core/event-coordinator";
import { PlayerLocationCache } from "../../classes/cache/player-location-cache";
import { PlayerCache } from "../../classes/cache/player-cache";

// ==========================================
// TYPES & LOCAL DATA STRUCTURES
// ==========================================

/** State tracking player corner selections via selection wand */
interface SelectionState {
    dimensionId: string;
    pos1?: Vector3D;
    pos2?: Vector3D;
    timestamp: number;
}

/** Active state for tracking players inside unauthorized claims */
interface DynamicTrackedPlayer {
    intervalId: number;
    originalGameMode: GameMode;
    claim: ClaimData;
}

/**
 * Indexed owner information used for fast offline claim discovery.
 *
 * ownerUuid is the authoritative player identity. ownerName is retained
 * for administrator-facing identification, especially while the player
 * is offline. claimIds contains every claim currently owned by this UUID.
 */
interface ClaimOwnerRecord {
    ownerUuid: string;
    ownerName: string;
    claimIds: Set<string>;
}

// ==========================================
// SPATIAL UTILITIES
// ==========================================

/**
 * Floors coordinate components to discrete integer values.
 * @param p Position vector to floor
 */
function floorVec(p: Vector3D): Vector3D {
    return {
        x: Math.floor(p.x),
        y: Math.floor(p.y),
        z: Math.floor(p.z),
    };
}

/**
 * Generates a string chunk key for a given block coordinate.
 * @param x X coordinate
 * @param z Z coordinate
 */
function getChunkKey(x: number, z: number): string {
    return `${Math.floor(x / 16)},${Math.floor(z / 16)}`;
}

/**
 * Checks bounding box intersection between two axis-aligned 3D boxes.
 * @param minA Minimum bounds for box A
 * @param maxA Maximum bounds for box A
 * @param minB Minimum bounds for box B
 * @param maxB Maximum bounds for box B
 */
function doBoxesIntersect(minA: Vector3D, maxA: Vector3D, minB: Vector3D, maxB: Vector3D): boolean {
    return minA.x <= maxB.x && maxA.x >= minB.x && minA.y <= maxB.y && maxA.y >= minB.y && minA.z <= maxB.z && maxA.z >= minB.z;
}

/**
 * Checks if a point lies within a bounding box.
 * @param p Point coordinates
 * @param min Minimum box boundary
 * @param max Maximum box boundary
 */
function isPointInBox(p: Vector3D, min: Vector3D, max: Vector3D): boolean {
    return p.x >= min.x && p.x <= max.x && p.y >= min.y && p.y <= max.y && p.z >= min.z && p.z <= max.z;
}

/**
 * Checks if a point lies within a bounding box padded by a surrounding buffer.
 * @param p Point coordinates
 * @param min Minimum box boundary
 * @param max Maximum box boundary
 * @param buffer Additional distance padding
 */
function isPointInBoxWithBuffer(p: Vector3D, min: Vector3D, max: Vector3D, buffer: number): boolean {
    return p.x >= min.x - buffer && p.x <= max.x + buffer && p.y >= min.y - buffer && p.y <= max.y + buffer && p.z >= min.z - buffer && p.z <= max.z + buffer;
}

/**
 * Validates selection area size constraints according to system configuration.
 * @param p1 First corner position
 * @param p2 Second corner position
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
 * Generates random RGB color structure.
 */
function getRandomRGBColor(): RGBColor {
    return {
        r: Math.floor(Math.random() * 256),
        g: Math.floor(Math.random() * 256),
        b: Math.floor(Math.random() * 256),
    };
}

/**
 * Maps RGB color values to the closest Minecraft formatting color code.
 * @param color Source RGB color
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

/** Handles administrative logic, event checks, dynamic properties, and caching for land claims */
export class LandClaimManager {
    private static instance: LandClaimManager;

    /** Dynamic dynamic properties configuration accessor */
    public static get config() {
        return {
            get CLAIMS_ENABLED(): boolean {
                return (world.getDynamicProperty("claim_enabled") as boolean) ?? false;
            },
            get MIN_SIZE(): number {
                return (world.getDynamicProperty("claim_min_size") as number) ?? 10;
            },
            get MAX_SIZE(): number {
                return (world.getDynamicProperty("claim_max_size") as number) ?? 128;
            },
            get MAX_AREA(): number {
                return (world.getDynamicProperty("claim_max_area") as number) ?? 16384;
            },
            get MAX_CLAIMS_PER_PLAYER(): number {
                return (world.getDynamicProperty("claim_max_claims_per_player") as number) ?? 3;
            },
            get CLAIM_BUFFER(): number {
                return (world.getDynamicProperty("claim_buffer") as number) ?? 5;
            },
        };
    }

    private eventSubscriptions: Array<() => void> = [];
    private chunkMap = new Map<string, Map<string, Set<string>>>();
    private claimsCache = new Map<string, ClaimData>();

    /**
     * O(1) owner lookup by authoritative player.id.
     * This index is populated from the persistent claim database, so offline
     * players remain discoverable even when they are not in PlayerCache.
     */
    private claimsByOwner = new Map<string, ClaimOwnerRecord>();

    /**
     * Case-insensitive owner-name lookup. Names are identifiers for human
     * targeting only; ownerUuid remains authoritative for ownership checks.
     */
    private ownerNameIndex = new Map<string, string>();

    private playerSelections = new Map<string, SelectionState>();
    private pendingClaimLocks = new Set<string>();
    private trackedPlayers = new Map<string, DynamicTrackedPlayer>();

    public static readonly WAND_ITEM_ID = "minecraft:golden_hoe";
    public static readonly SELECTION_TIMEOUT_MS = 300000;
    public static readonly BUFFER_EXIT_DISTANCE = 5;
    public static readonly TRACKING_INTERVAL_TICKS = 10;

    private constructor() {
        PlayerLocationCache.init();

        EventCoordinator.unsubscribeAfter("playerLeave", (ev) => {
            this.playerSelections.delete(ev.playerId);
            this.stopTrackingPlayer(ev.playerId);
        });
    }

    /**
     * Retrieves singleton instance of LandClaimManager.
     */
    public static getInstance(): LandClaimManager {
        if (!LandClaimManager.instance) {
            LandClaimManager.instance = new LandClaimManager();
        }
        return LandClaimManager.instance;
    }

    /**
     * Enables or disables globally configured land claim features.
     * @param enabled Target toggle state
     */
    public setClaimsEnabled(enabled: boolean): void {
        world.setDynamicProperty("claim_enabled", enabled);
        this.updateEventSubscriptionState();
    }

    /**
     * Synchronizes registered Minecraft events with global plugin enabled flags.
     */
    public updateEventSubscriptionState(): void {
        const isEnabled = LandClaimManager.config.CLAIMS_ENABLED;

        if (isEnabled) {
            this.registerEventHandlers();
        } else {
            this.unregisterEventHandlers();
        }
    }

    /**
     * Initializes claim caches and synchronization from database storage.
     */
    public async init(): Promise<void> {
        try {
            this.updateEventSubscriptionState();

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
     * Adds claim spatial keys to chunk maps and local cache.
     * @param claim Claim dataset
     */
    private cacheClaim(claim: ClaimData): void {
        // Protect the indexes from duplicate/stale entries if the same claim
        // ID is ever loaded or refreshed more than once.
        const existingClaim = this.claimsCache.get(claim.id);
        if (existingClaim) {
            this.removeClaimIndexes(existingClaim);
        }

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

        // Index the claim by its authoritative owner UUID.
        let ownerRecord = this.claimsByOwner.get(claim.ownerUuid);
        if (!ownerRecord) {
            ownerRecord = {
                ownerUuid: claim.ownerUuid,
                ownerName: claim.ownerName,
                claimIds: new Set<string>(),
            };
            this.claimsByOwner.set(claim.ownerUuid, ownerRecord);
        } else {
            // Keep the most recently encountered stored name available for
            // administrator-facing identification.
            ownerRecord.ownerName = claim.ownerName;
        }

        ownerRecord.claimIds.add(claim.id);

        // Index the stored name as a human-friendly lookup key.
        if (claim.ownerName) {
            this.ownerNameIndex.set(claim.ownerName.toLowerCase(), claim.ownerUuid);
        }
    }

    /**
     * Removes a claim from every in-memory index.
     * @param claim Claim being removed
     */
    private removeClaimIndexes(claim: ClaimData): void {
        this.claimsCache.delete(claim.id);

        // Remove from spatial chunk indexes.
        const dimMap = this.chunkMap.get(claim.dimensionId);
        if (dimMap) {
            const minChunkX = Math.floor(claim.min.x / 16);
            const maxChunkX = Math.floor(claim.max.x / 16);
            const minChunkZ = Math.floor(claim.min.z / 16);
            const maxChunkZ = Math.floor(claim.max.z / 16);

            for (let cx = minChunkX; cx <= maxChunkX; cx++) {
                for (let cz = minChunkZ; cz <= maxChunkZ; cz++) {
                    const chunkKey = `${cx},${cz}`;
                    const claimIds = dimMap.get(chunkKey);
                    if (!claimIds) continue;

                    claimIds.delete(claim.id);
                    if (claimIds.size === 0) {
                        dimMap.delete(chunkKey);
                    }
                }
            }

            if (dimMap.size === 0) {
                this.chunkMap.delete(claim.dimensionId);
            }
        }

        // Remove from the owner index.
        const ownerRecord = this.claimsByOwner.get(claim.ownerUuid);
        if (ownerRecord) {
            ownerRecord.claimIds.delete(claim.id);

            if (ownerRecord.claimIds.size === 0) {
                this.claimsByOwner.delete(claim.ownerUuid);
            }
        }

        // Remove the name lookup only when it still resolves to this owner.
        const normalizedName = claim.ownerName?.toLowerCase();
        if (normalizedName && this.ownerNameIndex.get(normalizedName) === claim.ownerUuid) {
            this.ownerNameIndex.delete(normalizedName);

            // The same owner may have older claims containing an older name.
            // Restore one of those names if it is still represented.
            const remainingOwner = this.claimsByOwner.get(claim.ownerUuid);
            if (remainingOwner) {
                for (const remainingClaimId of remainingOwner.claimIds) {
                    const remainingClaim = this.claimsCache.get(remainingClaimId);
                    if (remainingClaim?.ownerName) {
                        this.ownerNameIndex.set(remainingClaim.ownerName.toLowerCase(), claim.ownerUuid);
                        break;
                    }
                }
            }
        }
    }

    /**
     * Retrieves existing claim containing specified coordinates.
     * @param pos Location vector
     * @param dimensionId Target dimension identifier string
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
     * Fetches claims owned by a target player identifier or name.
     * @param ownerUuidOrName Search criteria string
     */
    public getClaimsByOwner(ownerUuidOrName: string): ClaimData[] {
        const identifier = ownerUuidOrName.trim();
        if (!identifier) return [];

        // UUID/ID is the authoritative lookup path.
        let ownerRecord = this.claimsByOwner.get(identifier);

        // Fall back to case-insensitive stored player name for offline admins.
        if (!ownerRecord) {
            const ownerUuid = this.ownerNameIndex.get(identifier.toLowerCase());
            if (ownerUuid) {
                ownerRecord = this.claimsByOwner.get(ownerUuid);
            }
        }

        if (!ownerRecord) return [];

        const results: ClaimData[] = [];
        for (const claimId of ownerRecord.claimIds) {
            const claim = this.claimsCache.get(claimId);
            if (claim) {
                results.push(claim);
            }
        }

        return results;
    }

    /**
     * Retrieves the indexed owner record by UUID or stored player name.
     * @param identifier Player UUID/ID or case-insensitive player name
     */
    public getClaimOwner(identifier: string): ClaimOwnerRecord | undefined {
        const value = identifier.trim();
        if (!value) return undefined;

        const direct = this.claimsByOwner.get(value);
        if (direct) return direct;

        const ownerUuid = this.ownerNameIndex.get(value.toLowerCase());
        return ownerUuid ? this.claimsByOwner.get(ownerUuid) : undefined;
    }

    /**
     * Returns every player who currently owns at least one registered claim.
     * Includes offline players because the data comes from the persistent
     * claim index rather than the currently connected-player cache.
     */
    public getClaimOwners(): ClaimOwnerRecord[] {
        return Array.from(this.claimsByOwner.values());
    }

    /**
     * Retrieves a specific claim by ID or owner search string.
     * Supports exact ID, case-insensitive ID, or single claim owner match.
     * @param claimIdOrOwner Unique ID or player query string
     */
    public getClaimById(claimIdOrOwner: string): ClaimData | undefined {
        // Direct map key lookup
        if (this.claimsCache.has(claimIdOrOwner)) {
            return this.claimsCache.get(claimIdOrOwner);
        }

        const lowerSearch = claimIdOrOwner.toLowerCase();

        // Case-insensitive ID lookup
        for (const [id, claim] of this.claimsCache.entries()) {
            if (id.toLowerCase() === lowerSearch) {
                return claim;
            }
        }

        // Owner-prefixed fallback lookup
        const ownerClaims = this.getClaimsByOwner(claimIdOrOwner);
        if (ownerClaims.length === 1) {
            return ownerClaims[0];
        }

        return undefined;
    }

    /**
     * Determines whether new region bounds overlap with existing claims or violate buffer zones.
     * @param min Minimum bounds vector
     * @param max Maximum bounds vector
     * @param dimensionId Dimension identifier string
     * @param ownerUuid Creating owner player UUID
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

                    if (doBoxesIntersect(min, max, existing.min, existing.max)) {
                        return true;
                    }

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
     * Spawns armor stand corner markers equipped with colored helmets.
     * @param dimension Target world dimension
     * @param claim Created claim data
     * @param pos1 Selection primary location
     * @param pos2 Selection secondary location
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
     * Removes installed armor stand corner markers associated with a claim.
     * @param dimension Dimension holding target entities
     * @param claim Related claim record
     */
    private removeCornerArmorStands(dimension: Dimension, claim: ClaimData): void {
        const entities = dimension.getEntities({
            tags: [`claim_id:${claim.id}`],
        });

        for (const entity of entities) {
            try {
                entity.remove();
            } catch (err) {
                // Ignore removal errors
            }
        }
    }

    // ==========================================
    // CLAIM MANAGEMENT API
    // ==========================================

    /**
     * Creates new land claim bound to coordinates provided by player.
     * @param player Requesting player reference
     * @param p1 Primary corner location
     * @param p2 Secondary corner location
     */
    public async createClaim(player: Player, p1: Vector3D, p2: Vector3D): Promise<boolean> {
        if (!LandClaimManager.config.CLAIMS_ENABLED) {
            return false;
        }

        const lockKey = player.id;
        if (this.pendingClaimLocks.has(lockKey)) {
            player.sendMessage("§o§c[Paradox] Processing previous claim creation request...");
            return false;
        }

        const config = LandClaimManager.config;

        const existingClaims = this.getClaimsByOwner(player.id);
        if (existingClaims.length >= config.MAX_CLAIMS_PER_PLAYER) {
            player.sendMessage(`§o§c[Paradox] You have reached the maximum claim limit of ${config.MAX_CLAIMS_PER_PLAYER} claims.`);
            return false;
        }

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

            if (this.hasOverlapOrBufferViolation(min, max, playerDimension.id, player.id)) {
                player.sendMessage(`§o§c[Paradox] Cannot claim: Selected area overlaps with an existing claim or is within ${config.CLAIM_BUFFER} blocks of another player's territory.`);
                return false;
            }

            // Sanitize owner name for ID prefix
            const sanitizedOwner = player.name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
            const claimId = `${sanitizedOwner}_claim_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
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
     * Deletes specified land claim and cleans up related structures/markers.
     * @param claimId Unique identifier string for target claim
     */
    public async deleteClaim(claimId: string): Promise<boolean> {
        const claim = this.claimsCache.get(claimId);
        if (!claim) return false;

        const dim = world.getDimension(claim.dimensionId);
        if (dim) {
            this.removeCornerArmorStands(dim, claim);
        }

        // Remove the claim from the primary cache, spatial index, and owner
        // index before returning so no stale claim can be discovered later.
        this.removeClaimIndexes(claim);
        await landClaimsDB.delete(claimId);
        return true;
    }

    /**
     * Deletes all land claims associated with a given owner UUID or name.
     * @param ownerUuidOrName Search criteria string for owner
     */
    public async deleteClaimsByOwner(ownerUuidOrName: string): Promise<number> {
        const claimsToDelete = this.getClaimsByOwner(ownerUuidOrName);
        let deletedCount = 0;

        for (const claim of claimsToDelete) {
            const success = await this.deleteClaim(claim.id);
            if (success) {
                deletedCount++;
            }
        }

        return deletedCount;
    }

    /**
     * Adds dynamic trusted member entry to target claim permissions.
     * @param claimId Target claim ID
     * @param memberIdentifier Player UUID or account name
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
     * Removes existing trusted member entry from claim permissions.
     * @param claimId Target claim ID
     * @param memberIdentifier Player UUID or account name
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
     * Verifies whether player has authorized builder permissions on target claim.
     * @param player Query player reference
     * @param claim Target claim dataset
     */
    public isAuthorized(player: Player, claim: ClaimData): boolean {
        return claim.ownerUuid === player.id || claim.ownerName === player.name || claim.members.includes(player.id) || claim.members.includes(player.name);
    }

    /**
     * Converts Minecraft cardinal or spatial directions to vector axis offsets.
     * @param direction Target face direction
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
     * Temporarily enforces Adventure gamemode protection when unauthorized players enter claim bounds.
     * @param player Interacting player
     * @param claim Affected claim dataset
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
     * Clears tracking intervals for monitored visitors.
     * @param playerId System ID of tracked target
     */
    private stopTrackingPlayer(playerId: string): void {
        const tracking = this.trackedPlayers.get(playerId);
        if (tracking) {
            system.clearRun(tracking.intervalId);
            this.trackedPlayers.delete(playerId);
        }
    }

    // ==========================================
    // DYNAMIC EVENT SUBSCRIPTION LOGIC
    // ==========================================

    /** Registers Minecraft scripting engine protection event listeners */
    private registerEventHandlers(): void {
        if (this.eventSubscriptions.length > 0) return;

        const unsubHurt = EventCoordinator.subscribeBefore("entityHurt", (ev) => {
            const { hurtEntity, damageSource } = ev;

            const claim = this.getClaimAt(hurtEntity.location, hurtEntity.dimension.id);
            if (!claim) return;

            const attacker = damageSource.damagingEntity;

            if (attacker instanceof Player) {
                if (!this.isAuthorized(attacker, claim)) {
                    ev.cancel = true;
                    attacker.sendMessage("§o§c[Paradox] You cannot cause damage inside this protected claim.");
                    system.run(() => this.enforceGamemodeSafeguard(attacker, claim));
                }
                return;
            }

            if (hurtEntity instanceof Player && this.isAuthorized(hurtEntity, claim)) {
                ev.cancel = true;
                return;
            }

            if (damageSource.cause === EntityDamageCause.blockExplosion || damageSource.cause === EntityDamageCause.entityExplosion) {
                ev.cancel = true;
            }
        });

        const unsubInteract = EventCoordinator.subscribeBefore("playerInteractWithBlock", (ev) => {
            const { player, block, itemStack, blockFace } = ev;

            if (itemStack?.typeId === LandClaimManager.WAND_ITEM_ID) {
                ev.cancel = true;
                system.run(() => this.handleWandClick(player, block.location));
                return;
            }

            const transform = PlayerLocationCache.getTransform(player);
            const dimensionId = transform?.dimension.id ?? player.dimension.id;
            const currentClaim = this.getClaimAt(block.location, dimensionId);

            const liquidBuckets = ["minecraft:lava_bucket", "minecraft:water_bucket", "minecraft:powder_snow_bucket"];
            if (itemStack && liquidBuckets.includes(itemStack.typeId)) {
                const pushOffset = this.getDirectionOffset(blockFace);
                const targetPos: Vector3D = {
                    x: block.location.x + pushOffset.x,
                    y: block.location.y + pushOffset.y,
                    z: block.location.z + pushOffset.z,
                };

                const targetClaim = this.getClaimAt(targetPos, dimensionId);

                if (targetClaim && !this.isAuthorized(player, targetClaim)) {
                    ev.cancel = true;
                    player.sendMessage("§o§c[Paradox] You cannot place liquids inside a protected land claim.");
                    system.run(() => this.enforceGamemodeSafeguard(player, targetClaim));
                    return;
                }
            }

            if (currentClaim && !this.isAuthorized(player, currentClaim)) {
                ev.cancel = true;
                player.sendMessage("§o§c[Paradox] You don't have permission to interact here.");
                system.run(() => this.enforceGamemodeSafeguard(player, currentClaim));
            }
        });

        const unsubPlace = EventCoordinator.subscribeBefore("playerPlaceBlock", (ev) => {
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

        const unsubBreak = EventCoordinator.subscribeBefore("playerBreakBlock", (ev) => {
            const transform = PlayerLocationCache.getTransform(ev.player);
            const dimId = transform?.dimension.id ?? ev.player.dimension.id;
            const claim = this.getClaimAt(ev.block.location, dimId);
            if (claim && !this.isAuthorized(ev.player, claim)) {
                ev.cancel = true;
                ev.player.sendMessage("§o§c[Paradox] You don't have permission to break blocks here.");
                system.run(() => this.enforceGamemodeSafeguard(ev.player, claim));
            }
        });

        const unsubExplosion = EventCoordinator.subscribeBefore("explosion", (ev) => {
            const dimId = ev.dimension.id;
            const safeBlocks = ev.getImpactedBlocks().filter((block) => {
                return this.getClaimAt(block.location, dimId) === undefined;
            });
            ev.setImpactedBlocks(safeBlocks);
        });

        this.eventSubscriptions = [unsubHurt, unsubInteract, unsubPlace, unsubBreak, unsubExplosion];
    }

    /** Unsubscribes active listeners from world event coordinators */
    private unregisterEventHandlers(): void {
        for (const unsubscribe of this.eventSubscriptions) {
            try {
                unsubscribe();
            } catch (err) {
                // Ignore cleanup errors
            }
        }
        this.eventSubscriptions = [];
    }

    // ==========================================
    // SELECTION WAND HELPERS
    // ==========================================

    /**
     * Handles selection wand interactions for set claim point parameters.
     * @param player Triggering player reference
     * @param loc Target block vector
     */
    private handleWandClick(player: Player, loc: Vector3D): void {
        if (!LandClaimManager.config.CLAIMS_ENABLED) {
            return;
        }

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

export const landClaims = LandClaimManager.getInstance();

/**
 * Executes runtime configuration subcommands.
 * @param sender Invoking player
 * @param args Command argument list
 */
function handleConfigCommand(sender: Player, args: string[]): void {
    const param = args[1]?.toLowerCase();
    const valStr = args[2];
    const manager = LandClaimManager.getInstance();

    if (param === "reset") {
        world.setDynamicProperty("claim_min_size", undefined);
        world.setDynamicProperty("claim_max_size", undefined);
        world.setDynamicProperty("claim_max_area", undefined);
        world.setDynamicProperty("claim_max_claims_per_player", undefined);
        world.setDynamicProperty("claim_buffer", undefined);

        manager.setClaimsEnabled(false);

        sender.sendMessage("§2[§7Paradox§2]§o§7 All land claim configuration parameters have been reset to default values.");
        return;
    }

    if (!param) {
        sender.sendMessage("§o§c[Paradox] Usage: {prefix}landclaim config <enable|disable|min_size|max_size|max_area|max_claims|buffer|reset> [value]");
        return;
    }

    if (param === "enable" || param === "disable" || param === "enabled") {
        const enableState = param === "enable" || (param === "enabled" && valStr?.toLowerCase() === "true");
        manager.setClaimsEnabled(enableState);
        sender.sendMessage(`§2[§7Paradox§2]§o§7 Land claims are now ${enableState ? "§aENABLED" : "§cDISABLED"}§7.`);
        return;
    }

    if (!valStr) {
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
        sender.sendMessage("§o§c[Paradox] Invalid config key. Valid keys: enable, disable, min_size, max_size, max_area, max_claims, buffer, reset");
    }
}

/**
 * Outputs registered land claims held by online players.
 * @param sender Invoking player
 * @param manager System manager reference
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
 * Handles claim listing details display for requested target or sender.
 * @param sender Invoking player
 * @param manager System manager reference
 * @param isAdmin Permission flag
 * @param targetArg Requested player target identifier
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
            const owner = manager.getClaimOwner(targetArg);
            if (!owner) {
                sender.sendMessage(`§o§c[Paradox] No registered claim owner could be found matching "${targetArg}".`);
                return;
            }

            targetId = owner.ownerUuid;
            targetName = owner.ownerName;
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
 * Lists every registered claim owner, including players who are currently
 * offline. This is intentionally backed by the persistent owner index.
 * @param sender Invoking administrator
 * @param manager System manager reference
 */
function handleOwnersCommand(sender: Player, manager: LandClaimManager): void {
    const owners = manager.getClaimOwners();

    if (owners.length === 0) {
        sender.sendMessage("§o§c[Paradox] No registered land claim owners were found.");
        return;
    }

    const onlineIds = new Set(PlayerCache.getAllPlayers().map((player) => player.id));
    owners.sort((a, b) => a.ownerName.localeCompare(b.ownerName, undefined, { sensitivity: "base" }));

    const lines: string[] = [` `, `§2[§7Paradox§2]§o§7 Registered Claim Owners (§a${owners.length}§7):`, `§7Owners shown here may be offline. UUID/ID is authoritative.`, ` `];

    for (const owner of owners) {
        const status = onlineIds.has(owner.ownerUuid) ? "§aONLINE" : "§8OFFLINE";
        const claimCount = owner.claimIds.size;
        lines.push(`  §2• §f${owner.ownerName} §7[${status}§7] §7Claims: §e${claimCount} §7| ID: §8${owner.ownerUuid}`);
    }

    // Keep chat packets reasonably sized when a server has many claim owners.
    const CHUNK_SIZE = 8;
    for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
        sender.sendMessage(lines.slice(i, i + CHUNK_SIZE).join("\n"));
    }
}

/**
 * Processes trust and untrust permission mutations.
 * @param sender Invoking player
 * @param manager System manager reference
 * @param isAdmin Permission flag
 * @param isTrust Action state (true for trust, false for untrust)
 * @param targetClaimId Target claim identifier
 * @param targetPlayer Requested player target
 */
async function handleTrustCommand(sender: Player, manager: LandClaimManager, isAdmin: boolean, isTrust: boolean, targetClaimId?: string, targetPlayer?: string): Promise<void> {
    const actionName = isTrust ? "trust" : "untrust";
    if (!targetClaimId || !targetPlayer) {
        sender.sendMessage(`§o§c[Paradox] Please provide a Claim ID and player name/ID. Usage: {prefix}landclaim ${actionName} <claimId|player> <targetPlayer>`);
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
        const success = await manager.addMember(claim.id, memberIdToSave);
        sender.sendMessage(success ? `§2[§7Paradox§2]§o§7 Successfully trusted player "§a${targetPlayer}§7" on claim "§a${claim.id}§7".` : `§o§c[Paradox] Failed to add member to claim "${claim.id}".`);
    } else {
        const memberIdToRemove = targetOnlinePlayer && claim.members.includes(targetOnlinePlayer.id) ? targetOnlinePlayer.id : targetPlayer;
        const success = await manager.removeMember(claim.id, memberIdToRemove);
        sender.sendMessage(success ? `§2[§7Paradox§2]§o§7 Successfully untrusted player "§a${targetPlayer}§7" from claim "§a${claim.id}§7".` : `§o§c[Paradox] Player "${targetPlayer}" is not listed as a trusted member of claim "${claim.id}".`);
    }
}

/**
 * Deletes land claim by identifier or owner filter.
 * Supports deleting by online/offline player name or exact claim ID.
 * @param sender Invoking player
 * @param manager System manager reference
 * @param isAdmin Permission flag
 * @param targetClaimIdOrOwner Target claim identifier or owner name
 */
async function handleDeleteCommand(sender: Player, manager: LandClaimManager, isAdmin: boolean, targetClaimIdOrOwner?: string): Promise<void> {
    if (!targetClaimIdOrOwner) {
        sender.sendMessage("§o§c[Paradox] Please provide a valid Claim ID or Player Name to delete. Usage: {prefix}landclaim delete <claimId|playerName>");
        return;
    }

    // Attempt direct claim ID lookup first.
    let claim = manager.getClaimById(targetClaimIdOrOwner);

    if (claim) {
        if (claim.ownerUuid !== sender.id && !isAdmin) {
            sender.sendMessage("§o§c[Paradox] You do not have permission to delete this claim.");
            return;
        }

        const success = await manager.deleteClaim(claim.id);
        sender.sendMessage(success ? `§2[§7Paradox§2]§o§7 Successfully deleted land claim "§a${claim.id}§7" owned by "§a${claim.ownerName}§7". Corner markers removed.` : `§o§c[Paradox] Failed to delete land claim "${claim.id}".`);
        return;
    }

    // Fallback: Attempt owner lookup (works for both online and offline players).
    const ownerClaims = manager.getClaimsByOwner(targetClaimIdOrOwner);

    if (ownerClaims.length === 0) {
        sender.sendMessage(`§o§c[Paradox] No claims found matching "${targetClaimIdOrOwner}".`);
        return;
    }

    // Verify ownership permissions for all claims belonging to this owner.
    const isOwnerSelf = ownerClaims.some((c) => c.ownerUuid === sender.id);
    if (!isOwnerSelf && !isAdmin) {
        sender.sendMessage("§o§c[Paradox] You do not have permission to delete claims owned by other players.");
        return;
    }

    const ownerRecord = manager.getClaimOwner(targetClaimIdOrOwner);
    const resolvedOwnerName = ownerRecord?.ownerName ?? targetClaimIdOrOwner;

    // Delete all claims matching the owner name/UUID.
    const deletedCount = await manager.deleteClaimsByOwner(targetClaimIdOrOwner);
    if (deletedCount > 0) {
        sender.sendMessage(`§2[§7Paradox§2]§o§7 Successfully deleted ${deletedCount} land claim(s) owned by "§a${resolvedOwnerName}§7". Corner markers removed.`);
    } else {
        sender.sendMessage(`§o§c[Paradox] Failed to delete claims for player "§a${resolvedOwnerName}§7".`);
    }
}

/**
 * Sends detailed information regarding current position land claim.
 * @param sender Invoking player
 * @param manager System manager reference
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

/** Registered Chat/GUI Command Definition for land claiming system */
export const claimCommand: Command = {
    name: "landclaim",
    description: "Manage, inspect, and configure access or limits for registered land claims.",
    usage: "{prefix}landclaim <delete|list|owners|online|info|trust|untrust|config> [targetPlayer|claimId] [value]",
    examples: [
        `{prefix}landclaim trust Steve_claim_1700000000000_1234 Steve`,
        `{prefix}landclaim untrust Steve_claim_1700000000000_1234 Steve`,
        `{prefix}landclaim delete Steve`,
        `{prefix}landclaim delete Steve_claim_1700000000000_1234`,
        `{prefix}landclaim list`,
        `{prefix}landclaim list Steve`,
        `{prefix}landclaim owners`,
        `{prefix}landclaim online`,
        `{prefix}landclaim info`,
        `{prefix}landclaim config enable`,
        `{prefix}landclaim config disable`,
        `{prefix}landclaim config max_claims 5`,
        `{prefix}landclaim config min_size 10`,
        `{prefix}landclaim config claim_buffer 5`,
        `{prefix}landclaim config reset`,
    ],
    category: "Utility",
    securityClearance: 1,
    icon: "textures/items/gold_hoe.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Land Claim Management",
        get description(): string {
            const config = LandClaimManager.config;
            const statusText = config.CLAIMS_ENABLED ? "§aENABLED" : "§cDISABLED";
            return (
                "§l§2Land Claim Management§r\n" +
                `§7Global Claiming Status: ${statusText}\n` +
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
                "§7• §fDelete Claim:§7 Permanently abandon or remove claims by selecting online players or entering an offline player name/claim ID.\n" +
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
                name: "List All Claim Owners",
                icon: "textures/ui/multiplayer_glyph.png",
                securityClearance: 4,
                command: ["owners"],
                description: "Displays every player who owns registered claims, including offline players (Admin only)",
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
                icon: "textures/gui/newgui/trash.png",
                command: ["delete"],
                description: "Deletes claims by choosing an online player or manually specifying an offline player name/claim ID",
                requiredFields: ["deleteTarget"],
                generateModalForm: true,
            },
            {
                name: "Enable Land Claims",
                icon: "textures/ui/confirm.png",
                description: "Allow players to claim land (admin only).",
                securityClearance: 4,
                command: ["config", "enable"],
                generateModalForm: false,
            },
            {
                name: "Disable Land Claims",
                icon: "textures/ui/cancel.png",
                description: "Prevent players from claiming land (admin only).",
                securityClearance: 4,
                command: ["config", "disable"],
                generateModalForm: false,
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
                name: "\nSelect Online Player (or select 'Manual Input' below):",
                type: "dropdown",
                sourceType: "players",
                requiredFields: ["deleteTarget"],
            },
            {
                name: "Or Enter Player Name / Claim ID (for Offline Players or Specific Claims):",
                type: "text",
                placeholder: "e.g., Steve or Steve_claim_12345",
                requiredFields: ["deleteTarget"],
            },
            {
                name: "\nSelect Claim ID or Player Name:",
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
                options: ["enable", "disable", "min_size", "max_size", "max_area", "max_claims", "buffer"],
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
     * Entry point for executing the landclaim command.
     * @param message Event payload representing chat sending trigger
     * @param args Parameter list appended to command name
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

            case "owners":
            case "claimowners":
                if (!isAdmin) {
                    sender.sendMessage("§o§c[Paradox] You do not have clearance to inspect registered claim owners.");
                    return;
                }
                handleOwnersCommand(sender, manager);
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
                sender.sendMessage("§o§c[Paradox] Unknown subcommand. Available subcommands: list, owners, online, trust, untrust, delete, info, config");
                break;
        }
    },
};

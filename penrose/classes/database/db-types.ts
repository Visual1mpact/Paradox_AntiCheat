import { Player, Vector3 } from "@minecraft/server";
import { DatabaseValueObject } from "./data-hive";

/**
 * Represents the unique identifier for a Player (`Player.id`).
 */
type PlayerID = Player["id"];

/**
 * Represents the display name of a Player (`Player.name`).
 */
type PlayerName = Player["name"];

// ==========================================
// MODULE & SYSTEM CONFIGURATIONS
// ==========================================

/** Settings schema for the AFK check module timer */
export interface AFKCheckSettings {
    hours: number;
    minutes: number;
    seconds: number;
}

/** Settings schema for the LagClear check module timer */
export interface LagClearCheckSettings {
    hours: number;
    minutes: number;
    seconds: number;
}

/** Settings schema for gamemode enforcement checks */
export interface GamemodeCheckSettings {
    Adventure: boolean;
    Creative: boolean;
    Survival: boolean;
    Spectator: boolean;
}

/** Settings schema for device platform block enforcement */
export interface PlatformBlockSettings {
    console: boolean;
    desktop: boolean;
    mobile: boolean;
}

/** Settings schema for dimension world border boundaries */
export interface WorldBorderSettings {
    overworld: number;
    nether: number;
    end: number;
}

/** Settings schema for dimension lock enforcement */
export interface DimensionLockSettings {
    nether: boolean;
    theEnd: boolean;
}

/**
 * Mapping of Paradox anti-cheat modules to their configurable settings structures.
 */
export type ModuleSettingsMap = {
    afkCheck_b: AFKCheckSettings;
    gamemodeCheck_b: GamemodeCheckSettings;
    autoClickerCheck_b: undefined;
    flyCheck_b: undefined;
    killAuraCheck_b: undefined;
    scaffoldCheck_b: undefined;
    nameSpoofCheck_b: undefined;
    xrayDetection_b: undefined;
    selfAttackCheck_b: undefined;
    rateLimitCheck_b: undefined;
    packetMonitorCheck_b: undefined;
    visionCheck_b: undefined;
    lagClearCheck_b: LagClearCheckSettings;
    platformBlock_b: PlatformBlockSettings;
    hitReachCheck_b: undefined;
    spamCheck_b: undefined;
    worldBorderCheck_b: WorldBorderSettings;
    invSync_b: undefined;
    noClipCheck_b: undefined;
    chestLock_b: undefined;
    deathCoords_b: undefined;
    graveSaver_b: undefined;
    aimbotMonitorCheck_b: undefined;
    criticalsCheck_b: undefined;
    autoTotemCheck_b: undefined;
    pathingCheck_b: undefined;
    antiCrashCheck_b: undefined;
    dimensionLock_b: DimensionLockSettings;
    invalidMovementVectorCheck_b: undefined;
    inventoryMovementCheck_b: undefined;
};

/**
 * Schema for the `paradoxModules` database.
 * Maps module identifiers to their state and settings.
 */
export type ParadoxModulesSchema = Record<
    keyof ModuleSettingsMap,
    {
        enabled: boolean;
        settings?: ModuleSettingsMap[keyof ModuleSettingsMap];
    } & DatabaseValueObject
>;

// ==========================================
// LAND CLAIMS SCHEMA
// ==========================================

/** Represents a standard 3D spatial coordinate */
export interface Vector3D {
    x: number;
    y: number;
    z: number;
}

/** Represents an RGB color configuration (0–255 scale) */
export interface RGBColor {
    r: number;
    g: number;
    b: number;
}

/**
 * Document structure for a registered land claim.
 */
export interface ClaimData extends DatabaseValueObject {
    id: string;
    ownerUuid: string;
    ownerName: string;
    dimensionId: string;
    min: Vector3D;
    max: Vector3D;
    members: string[];
    created: number;
    color: RGBColor;
    markerEntityUuids?: string[];
}

/**
 * Schema for the `LandClaimsDB` database.
 * Maps unique claim IDs to registered claim data.
 */
export type LandClaimsSchema = Record<string, ClaimData>;

// ==========================================
// CHAT & ACCESS CONTROL SCHEMAS
// ==========================================

/**
 * Document structure for chat channels.
 */
export interface Channel extends DatabaseValueObject {
    Owner: PlayerID;
    Members: Record<PlayerID, string>;
    lastActive: number;
}

/**
 * Schema for the `channels` database.
 * Maps channel names to Channel details.
 */
export type ChannelsSchema = Record<string, Channel>;

/**
 * Document structure for disabled command entries.
 */
export interface DisabledCommandEntry extends DatabaseValueObject {
    disabledBy: PlayerName;
    timestamp: number;
}

/**
 * Schema for the `disabledCommands` database.
 * Maps command names to their disable state info.
 */
export type DisabledCommandsSchema = Record<string, DisabledCommandEntry>;

// ==========================================
// PLAYER MODERATION & LIST SCHEMAS
// ==========================================

/** Document structure for an individual warning */
export interface WarningEntry {
    reason: string;
    staff: string;
    timestamp: number;
}

/**
 * Document structure for player warnings.
 */
export interface PlayerWarnData extends DatabaseValueObject {
    warnings: WarningEntry[];
}

/**
 * Schema for the `warns` database.
 * Maps player names/IDs to warning history records.
 */
export type WarnsSchema = Record<PlayerName, PlayerWarnData>;

/** Document structure for whitelist/allowlist player records */
export interface ListPlayerRecord extends DatabaseValueObject {
    ID?: PlayerID;
}

/**
 * Schema for the `whitelist` database.
 * Maps whitelisted player names to persistent ID details.
 */
export type WhitelistPlayersSchema = Record<PlayerName, ListPlayerRecord>;

/**
 * Schema for the `allowlist` database.
 * Maps allowlisted player names to persistent ID details.
 */
export type AllowlistPlayersSchema = Record<PlayerName, ListPlayerRecord>;

/** Document structure for a banned player record */
export interface BanRecord extends DatabaseValueObject {
    reason: string;
    bannedBy: string;
    timestamp: number;
}

/**
 * Schema for the `banlist` database.
 * Maps banned player names to ban details.
 */
export type BanlistPlayersSchema = Record<PlayerName, BanRecord>;

// ==========================================
// SECURITY & CONTAINER SCHEMAS
// ==========================================

/** Document structure for container access logs */
export interface ContainerAccessLog {
    player: PlayerName;
    time: number;
}

/** Document structure for locked chest dynamic property entries */
export interface ChestLockRecord extends DatabaseValueObject {
    owner?: PlayerName;
    placedBy?: PlayerName;
    lastAccessed?: number;
    accessLog?: ContainerAccessLog[];
    sharedWith?: PlayerName[];
}

/**
 * Schema for the `chestLocks` database.
 * Maps block location keys (e.g., "minecraft:overworld:100_64_-200") to chest lock info.
 */
export type ChestLocksSchema = Record<string, ChestLockRecord>;

// ==========================================
// INVENTORY & AUDIT SCHEMAS
// ==========================================

/** Document structure for inventory sync snapshot records */
export interface InvSyncSnapshotRecord extends DatabaseValueObject {
    counts: Record<string, number>;
    time: number;
    name: string;
}

/**
 * Schema for the `invSyncSnapshots` database.
 * Maps player IDs to inventory snapshots.
 */
export type InvSyncSnapshots = Record<PlayerID, InvSyncSnapshotRecord>;

/** Document structure for inventory audit flag event entries */
export interface InvSyncAuditEvent {
    time: number;
    excessItems: Record<string, number>;
    totalExcess: number;
}

/** Document structure for player inventory audit records */
export interface InvSyncAuditRecord extends DatabaseValueObject {
    events: InvSyncAuditEvent[];
}

/**
 * Schema for the `invSyncAudit` database.
 * Maps player IDs to inventory audit histories.
 */
export type InvSyncAudit = Record<PlayerID, InvSyncAuditRecord>;

// ==========================================
// PLAYER METADATA & TELEPORTATION SCHEMAS
// ==========================================

/** Document structure for long-term forensic player metadata */
export interface PlayerMetadataRecord extends DatabaseValueObject {
    joinDate: string;
    firstPlatform: string;
    firstJoined: number;
    lastPlatform: string;
    lastSeen: number;
}

/**
 * Schema for the `playerMetadata` database.
 * Maps player IDs to session metadata histories.
 */
export type PlayerMetadataSchema = Record<PlayerID, PlayerMetadataRecord>;

/** Document structure for player home coordinates */
export interface HomesRecord extends DatabaseValueObject {
    locations: string[];
    maxHomes?: number;
}

/**
 * Schema for the `homes` database.
 * Maps player IDs to home location payloads.
 */
export type HomesSchema = Record<PlayerID, HomesRecord>;

/** Document structure for custom waypoints */
export interface WaypointData {
    name: string;
    location: Vector3;
    dimension: string;
    timestamp: number;
}

/** Document structure for waypoints navigation HUD state */
export interface WaypointRecord extends DatabaseValueObject {
    activeWaypointName?: string;
    maxWaypoints?: number;
    savedWaypoints: Record<string, WaypointData>;
}

/**
 * Schema for the `waypoints` database.
 * Maps player IDs to navigation HUD and saved waypoint records.
 */
export type WaypointsSchema = Record<PlayerID, WaypointRecord>;

// ==========================================
// ANTI-CHEAT VIOLATION FLAGS SCHEMA
// ==========================================

/** Document structure for individual flag violations */
export interface ViolationFlagEntry {
    flagType: string;
    details: string;
    timestamp: number;
    date: string;
    count: number;
}

/** Document structure for a player's flag record history */
export interface PlayerFlagRecord extends DatabaseValueObject {
    playerName: string;
    totalViolations: number;
    flags: ViolationFlagEntry[];
}

/**
 * Schema for the `flags` database.
 * Maps player IDs to historic violation flag records.
 */
export type FlagDatabaseSchema = Record<PlayerID, PlayerFlagRecord>;

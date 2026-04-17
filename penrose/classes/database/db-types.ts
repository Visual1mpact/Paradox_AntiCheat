import { Player } from "@minecraft/server";

/**
 * Represents the unique identifier for a Player (`Player.id`).
 */
type PlayerID = Player["id"];

/**
 * Represents the display name of a Player (`Player.name`).
 */
type PlayerName = Player["name"];

// Settings schema for AFK check module (used to configure timer)
type AFKCheckSettings = {
    hours: number;
    minutes: number;
    seconds: number;
};

// Settings schema for LagClear check module (used to configure timer)
type LagClearCheckSettings = {
    hours: number;
    minutes: number;
    seconds: number;
};

/**
 * Schema for the chestLocks database.
 * Each key is a unique block location key (dimension + X_Y_Z).
 * Value stores the player who owns/locked the chest.
 */
export type ChestLocksSchema = {
    [blockLocationKey: string]: {
        /** The player name who owns/locked this chest */
        owner?: PlayerName;
        /** The player name who placed the block in the world */
        placedBy?: PlayerName;
        /** Optional: track last access timestamp (ms) */
        lastAccessed?: number;
        /** Optional: access log of {player, time} */
        accessLog?: { player: PlayerName; time: number }[];
        /**
         * Players that are allowed to access ALL containers
         * owned by this owner.
         */
        sharedWith?: PlayerName[];
    };
};

// Settings schema for game mode enforcement
export type GamemodeCheckSettings = {
    Adventure: boolean;
    Creative: boolean;
    Survival: boolean;
    Spectator: boolean;
};

// Settings schema for platform block enforcement
export type PlatformBlockSettings = {
    console: boolean;
    desktop: boolean;
    mobile: boolean;
};

// Settings schema for world borders in each dimension
type WorldBorderSettings = {
    overworld: number;
    nether: number;
    end: number;
};

export type InvSyncSnapshots = {
    [playerId: string]: {
        counts: Record<string, number>;
        time: number;
        name: string;
    };
};

export type InvSyncAudit = {
    [playerId: string]: {
        events: {
            time: number;
            excessItems: Record<string, number>;
            totalExcess: number;
        }[];
    };
};

// Mapping of modules to their expected settings structure
export type ModuleSettingsMap = {
    afkCheck_b: AFKCheckSettings;
    gamemodeCheck_b: GamemodeCheckSettings;
    autoClickerCheck_b: undefined; // This module has no configurable settings
    flyCheck_b: undefined; // This module has no configurable settings
    killAuraCheck_b: undefined; // This module has no configurable settings
    scaffoldCheck_b: undefined; // This module has no configurable settings
    nameSpoofCheck_b: undefined; // This module has no configurable settings
    xrayDetection_b: undefined; // This module has no configurable settings
    selfAttackCheck_b: undefined; // This module has no configurable settings
    rateLimitCheck_b: undefined; // This module has no configurable settings
    packetMonitorCheck_b: undefined; // This module has no configurable settings
    visionCheck_b: undefined; // This module has no configurable settings
    lagClearCheck_b: LagClearCheckSettings;
    platformBlock_b: PlatformBlockSettings;
    hitReachCheck_b: undefined; // This module has no configurable settings
    spamCheck_b: undefined; // This module has no configurable settings
    worldBorderCheck_b: WorldBorderSettings;
    invSync_b: undefined; // This module has no configurable settings
    noClipCheck_b: undefined; // This module has no configurable settings
    chestLock_b: undefined; // This module has no configurable settings
    deathCoords_b: undefined; // This module has no configurable settings
    aimbotMonitorCheck_b: undefined; // This module has no configurable settings
    criticalsCheck_b: undefined; // This module has no configurable settings
    autoTotemCheck_b: undefined; // This module has no configurable settings
    pathingCheck_b: undefined; // This module has no configurable settings
    antiCrashCheck_b: undefined; // This module has no configurable settings
};

/**
 * Schema for the paradoxModules database.
 * Each key represents a module and its associated state/configuration.
 */
export type ParadoxModulesSchema = {
    [K in keyof ModuleSettingsMap]: {
        enabled: boolean;
        settings?: ModuleSettingsMap[K];
    };
};

/**
 * Schema for the channels database.
 * Each key is a channel name, mapped to a Channel object.
 */
export interface Channel {
    Owner: PlayerID;
    Members: Record<PlayerID, string>;
    lastActive: number;
}

export type ChannelsSchema = {
    [channelName: string]: Channel;
};

/**
 * Schema for the disabled commands database.
 * Each key is a command name.
 */
export type DisabledCommandsSchema = {
    [commandName: string]: {
        disabledBy: PlayerName;
        timestamp: number;
    };
};

/**
 * Schema for the trusted players database.
 * Each key is a player ID, mapped to identity tracking info.
 */
export type TrustedPlayersSchema = {
    players: {
        [playerId: PlayerID]: {
            name: PlayerName;
            knownNames: PlayerName[];
            firstSeen: number;
            lastSeen: number;
            spoofAttempts?: {
                name: PlayerName;
                timestamp: number;
            }[];
        };
    };
};

/**
 * Schema for the warns database.
 * Each key is a player name, mapped to an array of warning objects.
 */
export type WarnsSchema = {
    players: {
        [playerName: PlayerName]: {
            reason: string;
            staff: string;
            timestamp: number;
        }[];
    };
};

/**
 * Schema for the whitelist database.
 * Each key is a player name, optionally storing their persistent ID.
 */
export type WhitelistPlayersSchema = {
    players: {
        [playerName: PlayerName]: {
            ID?: PlayerID;
        };
    };
};

/**
 * Schema for the allowlist database.
 * Each key is a player name, optionally storing their persistent ID.
 */
export type AllowlistPlayersSchema = {
    players: {
        [playerName: PlayerName]: {
            ID?: PlayerID;
        };
    };
};

/**
 * Schema for the banlist database.
 * Each key is a player name, optionally storing their persistent ID.
 */
export type BanlistPlayersSchema = {
    players: {
        [playerName: PlayerName]: {
            reason: string;
            bannedBy: string;
            timestamp: number;
        };
    };
};

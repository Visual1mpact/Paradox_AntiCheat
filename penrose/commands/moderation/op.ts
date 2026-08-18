import { ChatSendBeforeEvent, Player, PlayerPermissionLevel, world } from "@minecraft/server";

import { Command } from "../../classes/command-handler";
import { addPlayerToSecurityClearanceList } from "../../utility/level-4-security-tracker";
import { PlayerCache } from "../../classes/cache/player-cache";

/**
 * Represents basic information stored about a player
 * who has been granted Paradox security clearance.
 */
interface PlayerInfo {
    /** Player's current in-game name */
    name: string;

    /** Unique runtime ID for the player */
    id: string;
}

/**
 * Structure used to store Paradox security configuration
 * in a world dynamic property.
 */
interface SecurityClearanceData {
    /**
     * The current host of the Paradox system.
     * The host has ultimate authority to grant
     * Level-4 security clearance.
     */
    host?: PlayerInfo;

    /**
     * List of all players who currently have
     * Level-4 Paradox security clearance.
     */
    securityClearanceList: PlayerInfo[];
}

/**
 * Dynamic property key used to store Paradox
 * security data within the world.
 */
const MODULE_KEY = "paradoxOPSEC";

/**
 * Determines whether a player has sufficient server
 * privileges to initialize the Paradox host.
 *
 * This check is designed to work across multiple
 * environments including:
 *
 * - Bedrock Dedicated Server (BDS)
 * - Realms
 * - Local worlds
 * - LAN worlds
 *
 * @param player - The player being evaluated
 * @returns True if the player has server operator privileges
 */
function hasServerAdmin(player: Player): boolean {
    return player.playerPermissionLevel >= PlayerPermissionLevel.Operator || player.commandPermissionLevel >= 2;
}

/**
 * Loads Paradox security configuration from the world.
 *
 * If no data exists yet, a default structure is returned.
 *
 * @returns The stored security configuration
 */
function getSecurityData(): SecurityClearanceData {
    const raw = world.getDynamicProperty(MODULE_KEY) as string;

    if (!raw) {
        return { securityClearanceList: [] };
    }

    return JSON.parse(raw);
}

/**
 * Persists Paradox security configuration to the world.
 *
 * @param data - The security configuration to save
 */
function saveSecurityData(data: SecurityClearanceData): void {
    world.setDynamicProperty(MODULE_KEY, JSON.stringify(data));
}

/**
 * Adds a player to the Paradox security clearance list
 * if they are not already present.
 *
 * This also triggers the external security tracking
 * system for Level-4 administrators.
 *
 * @param data - Current security configuration
 * @param player - Player to add to the clearance list
 */
function addPlayerToSecurityList(data: SecurityClearanceData, player: Player): void {
    const playerInfo: PlayerInfo = {
        name: player.name,
        id: player.id,
    };

    if (!data.securityClearanceList.some((p) => p.id === player.id)) {
        data.securityClearanceList.push(playerInfo);

        saveSecurityData(data);
    }

    addPlayerToSecurityClearanceList(player);
}

/**
 * Sends a formatted list of all Level-4 Paradox
 * administrators to a player.
 *
 * @param player - Player requesting the list
 * @param data - Current security configuration
 */
function displaySecurityList(player: Player, data: SecurityClearanceData): void {
    const hostInfo = data.host ? `§2Host§7: ${data.host.name} (§2ID§7: ${data.host.id})` : "§2Host§7: None";

    const list = data.securityClearanceList.map((p, i) => `§2${i + 1}§7. ${p.name} (§2ID§7: ${p.id})`).join("\n");

    player.sendMessage(
        `
§2[§7Paradox§2]§o§7 Players with Security Clearance 4:
§2--------------------------------------§7
${hostInfo}
${list}`
    );
}

/**
 * Processes the OP command logic.
 *
 * Responsibilities:
 *
 * 1. Initialize the first Paradox host
 * 2. Grant Level-4 security clearance
 * 3. Enforce host-only privilege escalation
 *
 * Security Rules:
 *
 * - Only server operators can initialize the first host
 * - Only the host can grant additional Level-4 privileges
 *
 * @param sender - Player executing the command
 * @param target - Target player receiving clearance
 * @param data - Current security configuration
 */
function processOp(sender: Player, target: Player, data: SecurityClearanceData): void {
    const hostId = data.host?.id;

    /**
     * FIRST HOST INITIALIZATION
     *
     * If no host exists, allow a server operator
     * to initialize the Paradox system.
     */
    if (!hostId) {
        if (!hasServerAdmin(sender)) {
            sender.sendMessage("§o§c[Paradox] Only server operators may initialize Paradox.");

            return;
        }

        data.host = {
            name: sender.name,
            id: sender.id,
        };

        sender.setDynamicProperty("securityClearance", 4);

        addPlayerToSecurityList(data, sender);

        saveSecurityData(data);

        sender.sendMessage("§2[§7Paradox§2]§o§7 You are now the system host.");

        return;
    }

    /**
     * HOST AUTHORIZATION CHECK
     *
     * Only the host can grant new Level-4 users.
     */
    if (sender.id !== hostId) {
        sender.sendMessage("§o§c[Paradox] Only the host can grant Paradox-OP.");

        return;
    }

    /**
     * GRANT SECURITY CLEARANCE
     */
    target.setDynamicProperty("securityClearance", 4);

    addPlayerToSecurityList(data, target);
    if (target.id !== sender.id) {
        target.sendMessage(`§2[§7Paradox§2]§o§7 Your security clearance was granted by ${sender.name}.`);
    }

    sender.sendMessage(`§2[§7Paradox§2]§o§7 ${target.name} now has security clearance level 4.`);
}

/**
 * Paradox OP command definition.
 *
 * This command manages Level-4 administrative access
 * within the Paradox security framework.
 *
 * Capabilities:
 *
 * - Initialize the Paradox host
 * - Grant Level-4 security clearance
 * - Display current administrators
 */
export const opCommand: Command = {
    name: "op",
    description: "Grant a player Paradox-Op!",
    usage: "{prefix}op <player> | {prefix}op list",
    examples: [`{prefix}op`, `{prefix}op Player Name`, `{prefix}op "Player Name"`, `{prefix}op help`, `{prefix}op list`],
    category: "Moderation",
    securityClearance: 4,
    icon: "textures/items/ender_eye",

    guiInstructions: {
        formType: "ActionFormData",
        title: "Grant OP Command",
        description:
            "Grant Paradox-OP to a player or view the current administrators.\n\n" +
            "§7• §fGrant OP§7: Select a player to grant security clearance level 4.\n" +
            "§7• §fList OP Players§7: View all players who currently have Paradox-OP.\n\n" +
            "§7Notes:\n" +
            "§7• Only the host can grant OP to others.\n" +
            "§7• First-time OP initialization requires a server operator.\n" +
            "§7• Player names are case-sensitive.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Grant OP to Player",
                description: "Select a player to grant OP status.",
                requiredFields: ["playerName"],
                generateModalForm: true,
                icon: "textures/ui/op.png",
            },

            {
                name: "List OP Players",
                command: ["list"],
                description: "See who has OP in Paradox.",
                icon: "textures/ui/icon_sign.png",
            },
        ],

        dynamicFields: [
            {
                name: "\nSelect Target Player:",
                type: "dropdown",
                sourceType: "players",
                requiredFields: ["playerName"],
            },
        ],
    },

    /**
     * Executes the OP command.
     *
     * @param message - Chat event containing command context
     * @param args - Parsed command arguments
     */
    execute(message?: ChatSendBeforeEvent, args: string[] = []): void {
        if (!message) return;

        const sender = message.sender;

        const securityCheck = sender.getDynamicProperty("securityClearance") as number;

        const data = getSecurityData();

        /**
         * LIST COMMAND
         *
         * Displays all Level-4 administrators.
         */
        if (args[0] === "list") {
            if (securityCheck !== 4) {
                sender.sendMessage("§o§c[Paradox] You do not have permission.");

                return;
            }

            displaySecurityList(sender, data);

            return;
        }

        /**
         * TARGET PLAYER RESOLUTION
         */
        let target: Player | undefined;

        const playerName = args.join(" ").trim().replace(/[@"]+/g, "");

        if (playerName.length > 0) {
            target = PlayerCache.getPlayerByName(playerName);
        }

        if (!target && playerName.length === 0) {
            target = sender;
        }

        if (!target) {
            sender.sendMessage(`§o§c[Paradox] Player "${playerName}" not found.`);

            return;
        }

        processOp(sender, target, data);
    },
};

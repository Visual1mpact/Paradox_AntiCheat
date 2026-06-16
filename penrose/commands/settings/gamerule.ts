import { ChatSendBeforeEvent, world } from "@minecraft/server";
import { Command } from "../../classes/command-handler";

const BOOLEAN_RULES = [
    "allowDestructiveObjects",
    "commandBlockOutput",
    "commandBlocksEnabled",
    "doDaylightCycle",
    "doEntityDrops",
    "doFireTick",
    "doImmediateRespawn",
    "doInsomnia",
    "doLimitedCrafting",
    "doMobLoot",
    "doMobSpawning",
    "doTileDrops",
    "doWeatherCycle",
    "drowningDamage",
    "fallDamage",
    "fireDamage",
    "freezeDamage",
    "keepInventory",
    "mobGriefing",
    "pvp",
    "recipesUnlock",
    "sendCommandFeedback",
    "showCoordinates",
    "showDeathMessages",
    "showTags",
];

const NUMBER_RULES = ["functionCommandLimit", "maxCommandChainLength", "randomTickSpeed", "spawnRadius"];

/**
 * Command to modify Minecraft game rules.
 * Supports both boolean and number values as exposed by the Scripting API.
 */
export const gameruleCommand: Command = {
    name: "gamerule",
    description: "Allows administrators to modify Minecraft game rules (Boolean or Number).",
    usage: "{prefix}gamerule <ruleName> <value>",
    examples: ["{prefix}gamerule pvp false", "{prefix}gamerule randomTickSpeed 3", "{prefix}gamerule doDaylightCycle true"],
    category: "Utility",
    securityClearance: 4,
    icon: "textures/items/book_writable.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Game Rule Manager",
        description:
            "Directly adjust the world's behavior by modifying game rules.\n\n" +
            "§7• §fBoolean§7: Toggle mechanics (e.g., pvp, keepInventory).\n" +
            "§7• §fNumber§7: Set numeric limits (e.g., spawnRadius, randomTickSpeed).\n\n" +
            "§7Select a rule from the dropdown and provide the new value.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Update Rule",
                description: "Change a game rule value.",
                requiredFields: ["rule", "value"],
                generateModalForm: true,
                icon: "textures/ui/toggle_on.png",
            },
        ],
        dynamicFields: [
            {
                name: "\nSelect Game Rule:",
                type: "dropdown",
                options: [...BOOLEAN_RULES, ...NUMBER_RULES].sort(),
                requiredFields: ["rule"],
            },
            {
                name: "\nNew Value (true/false or Number):",
                type: "text",
                placeholder: "e.g. true, false, or 3",
                requiredFields: ["value"],
            },
        ],
    },
    execute: (message?: ChatSendBeforeEvent, args: string[] = []) => {
        if (!message) return;
        const sender = message.sender;

        if (args.length < 2) {
            sender.sendMessage("§o§c[Paradox] Usage: !gamerule <ruleName> <value>");
            return;
        }

        const ruleInput = args[0].replace(/["']/g, "");
        const valueInput = args[1].toLowerCase();

        // The world.gameRules object contains the rules.
        // We attempt to find the correct casing by checking keys or direct lookup.
        let ruleKey = Object.keys(world.gameRules).find((k) => k.toLowerCase() === ruleInput.toLowerCase()) as keyof typeof world.gameRules;

        // Fallback for non-enumerable properties in the API
        if (!ruleKey && ruleInput in world.gameRules) {
            ruleKey = ruleInput as keyof typeof world.gameRules;
        }

        if (!ruleKey) {
            sender.sendMessage(`§o§c[Paradox] Game rule "${ruleInput}" not found or not exposed by the Script API.`);
            return;
        }

        try {
            const currentValue = world.gameRules[ruleKey];
            let newValue: boolean | number;

            if (BOOLEAN_RULES.includes(ruleKey) || typeof currentValue === "boolean") {
                if (["true", "1", "on"].includes(valueInput)) newValue = true;
                else if (["false", "0", "off"].includes(valueInput)) newValue = false;
                else {
                    sender.sendMessage(`§o§c[Paradox] Rule "${ruleKey}" requires a boolean value (true/false).`);
                    return;
                }
            } else if (NUMBER_RULES.includes(ruleKey) || typeof currentValue === "number") {
                newValue = Number(valueInput);
                if (isNaN(newValue)) {
                    sender.sendMessage(`§o§c[Paradox] Rule "${ruleKey}" requires a numeric value.`);
                    return;
                }
            } else {
                sender.sendMessage(`§o§c[Paradox] Unsupported game rule type: ${typeof currentValue}`);
                return;
            }

            // Apply the change
            (world.gameRules as any)[ruleKey] = newValue;

            sender.sendMessage(`§2[§7Paradox§2]§o§7 Game rule §a${ruleKey}§7 is now set to: §f${newValue}§7.`);
        } catch (error) {
            sender.sendMessage(`§o§c[Paradox] Failed to set game rule: ${error}`);
        }
    },
};

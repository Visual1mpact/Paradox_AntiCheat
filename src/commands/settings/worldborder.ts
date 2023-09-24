import { ChatSendAfterEvent, Player, Vector3, world } from "@minecraft/server";
import config from "../../data/config.js";
import { WorldBorder } from "../../penrose/TickEvent/worldborder/worldborder.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";

function worldBorderHelp(player: Player, prefix: string, worldBorderBoolean: string | number | boolean | Vector3) {
    let commandStatus: string;
    if (!config.customcommands.worldborder) {
        commandStatus = "§6[§4DISABLED§6]§f";
    } else {
        commandStatus = "§6[§aENABLED§6]§f";
    }
    let moduleStatus: string;
    if (worldBorderBoolean === false) {
        moduleStatus = "§6[§4DISABLED§6]§f";
    } else {
        moduleStatus = "§6[§aENABLED§6]§f";
    }
    return sendMsgToPlayer(player, [
        `\n§o§4[§6Command§4]§f: worldborder`,
        `§4[§6Status§4]§f: ${commandStatus}`,
        `§4[§6Module§4]§f: ${moduleStatus}`,
        `§4[§6Usage§4]§f: worldborder <value> [optional]`,
        `§4[§6Optional§4]§f: disable, help`,
        `§4[§6Description§4]§f: Sets the world border and restricts players to that border.`,
        `§4[§6Examples§4]§f:`,
        `    ${prefix}worldborder 10000 5000`,
        `    ${prefix}worldborder -o 10000 -n 5000 -e 10000`,
        `    ${prefix}worldborder -overworld 10000 -nether 5000`,
        `    ${prefix}worldborder -overworld 10000`,
        `    ${prefix}worldborder -nether 5000`,
        `    ${prefix}worldborder -n 5000`,
        `    ${prefix}worldborder disable`,
        `    ${prefix}worldborder help`,
    ]);
}

function setWorldBorder(player: Player, overworldSize: number, netherSize: number, endSize: number) {
    sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has set the §6World Border§f! Overworld: §7${overworldSize}§f Nether: §7${netherSize}§f End: §7${endSize}§f`);
    dynamicPropertyRegistry.set("worldborder_b", true);
    dynamicPropertyRegistry.set("worldborder_n", Math.abs(overworldSize));
    dynamicPropertyRegistry.set("worldborder_nether_n", Math.abs(netherSize));
    dynamicPropertyRegistry.set("worldborder_end_n", Math.abs(endSize));
    world.setDynamicProperty("worldborder_b", true);
    world.setDynamicProperty("worldborder_n", Math.abs(overworldSize));
    world.setDynamicProperty("worldborder_nether_n", Math.abs(netherSize));
    world.setDynamicProperty("worldborder_end_n", Math.abs(endSize));
    WorldBorder();
}

/**
 * @name worldborder
 * @param {ChatSendAfterEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function worldborders(message: ChatSendAfterEvent, args: string[]) {
    if (!message) {
        return console.warn(`${new Date()} | Error: ${message} isn't defined. Did you forget to pass it? (./commands/settings/worldborder.js:38)`);
    }

    const player = message.sender;
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to use this command.`);
    }

    const prefix = getPrefix(player);
    const worldBorderBoolean = dynamicPropertyRegistry.get("worldborder_b");

    // Cache
    const length = args.length;

    if (!length || args[0].toLowerCase() === "help" || !config.customcommands.worldborder) {
        return worldBorderHelp(player, prefix, worldBorderBoolean);
    }

    // Shutdown worldborder
    if (args[0] === "disable") {
        // Disable Worldborder
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has disabled the §6World Border§f!`);
        dynamicPropertyRegistry.set("worldborder_b", false);
        dynamicPropertyRegistry.set("worldborder_n", 0);
        dynamicPropertyRegistry.set("worldborder_nether_n", 0);
        dynamicPropertyRegistry.set("worldborder_end_n", 0);
        world.setDynamicProperty("worldborder_b", false);
        world.setDynamicProperty("worldborder_n", 0);
        world.setDynamicProperty("worldborder_nether_n", 0);
        world.setDynamicProperty("worldborder_end_n", 0);
        return;
    }

    const paramIndexes: { [key: string]: number } = {
        "-overworld": -1,
        "-o": -1,
        "-nether": -1,
        "-n": -1,
        "-end": -1,
        "-e": -1,
    };

    for (let i = 0; i < length; i++) {
        if (paramIndexes[args[i]] !== undefined) {
            paramIndexes[args[i]] = i;
        }
    }

    let overworldSize = dynamicPropertyRegistry.get("worldborder_n") || 0;
    let netherSize = dynamicPropertyRegistry.get("worldborder_nether_n") || 0;
    let endSize = dynamicPropertyRegistry.get("worldborder_end_n") || 0;

    for (let i = 0; i < length; i++) {
        const arg = args[i].toLowerCase();
        switch (arg) {
            case "-overworld":
            case "-o":
                overworldSize = Number(args[i + 1]);
                break;
            case "-nether":
            case "-n":
                netherSize = Number(args[i + 1]);
                break;
            case "-end":
            case "-e":
                endSize = Number(args[i + 1]);
                break;
        }
    }

    if (overworldSize || netherSize || endSize) {
        setWorldBorder(player, overworldSize as number, netherSize as number, endSize as number);
        return;
    }

    return worldBorderHelp(player, prefix, worldBorderBoolean);
}

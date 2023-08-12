import { world, Player, ChatSendAfterEvent } from "@minecraft/server";
import { MinecraftEffectTypes } from "../../node_modules/@minecraft/vanilla-data/lib/index";
import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";

function freezeHelp(player: Player, prefix: string) {
    let commandStatus: string;
    if (!config.customcommands.freeze) {
        commandStatus = "§6[§4DISABLED§6]§f";
    } else {
        commandStatus = "§6[§aENABLED§6]§f";
    }
    return sendMsgToPlayer(player, [
        `\n§o§4[§6Command§4]§f: freeze`,
        `§4[§6Status§4]§f: ${commandStatus}`,
        `§4[§6Usage§4]§f: freeze [optional]`,
        `§4[§6Optional§4]§f: username, help`,
        `§4[§6Description§4]§f: Will freeze or unfreeze the specified player.`,
        `§4[§6Examples§4]§f:`,
        `    ${prefix}freeze ${player.name}`,
        `        §4- §6Freeze or unfreeze ${player.name}§f`,
        `    ${prefix}freeze help`,
        `        §4- §6Show command help§f`,
    ]);
}

/**
 * @name freeze
 * @param {ChatSendAfterEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export async function freeze(message: ChatSendAfterEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/utility/freeze.js:30)");
    }

    const player = message.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to use this command.`);
    }

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Are there arguements
    if (!args.length) {
        return freezeHelp(player, prefix);
    }

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.freeze) {
        return freezeHelp(player, prefix);
    }

    // try to find the player requested
    let member: Player;
    const players = world.getPlayers();
    for (const pl of players) {
        if (pl.name.toLowerCase().includes(args[0].toLowerCase().replace(/"|\\|@/g, ""))) {
            member = pl;
            break;
        }
    }

    if (!member) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Couldnt find that player!`);
    }

    // Get unique ID
    const uniqueId2 = dynamicPropertyRegistry.get(member?.id);

    // Make sure the user has permissions to run the command
    if (uniqueId2 === member.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You cannot freeze staff members.`);
    }

    const boolean = member.hasTag("paradoxFreeze");

    if (boolean) {
        member.removeTag("paradoxFreeze");
        member.runCommand(`effect @s clear`);
        sendMsgToPlayer(member, `§f§4[§6Paradox§4]§f You are no longer frozen.`);
        sendMsg(`@a[tag=paradoxOpped]`, `${member.name}§f is no longer frozen.`);
        return;
    }

    if (!boolean) {
        // Blindness
        member.addEffect(MinecraftEffectTypes.Blindness, 1000000, { amplifier: 255, showParticles: true });
        // Mining Fatigue
        member.addEffect(MinecraftEffectTypes.MiningFatigue, 1000000, { amplifier: 255, showParticles: true });
        // Weakness
        member.addEffect(MinecraftEffectTypes.Weakness, 1000000, { amplifier: 255, showParticles: true });
        // Slowness
        member.addEffect(MinecraftEffectTypes.Slowness, 1000000, { amplifier: 255, showParticles: true });
        member.addTag("paradoxFreeze");
        sendMsgToPlayer(member, `§f§4[§6Paradox§4]§f You are now frozen.`);
        sendMsg(`@a[tag=paradoxOpped]`, `${member.name}§f is now frozen.`);
        return;
    }
}

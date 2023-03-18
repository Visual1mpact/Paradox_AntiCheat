import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";
import { crypto, sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

export async function uiLOCKDOWN(lockdownResult: ModalFormResponse, player: Player) {
    const [reason, LockdownToggle] = lockdownResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.scoreboard?.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped.`);
    }
    if (LockdownToggle === true) {
        // Lock it down
        for (const pl of world.getPlayers()) {
            // Check for hash/salt and validate password
            const hash = pl.getDynamicProperty("hash");
            const salt = pl.getDynamicProperty("salt");
            const encode = crypto?.(salt, config?.modules?.encryption?.password);
            if (hash !== undefined && encode === hash) {
                continue;
            }
            try {
                // Kick players from server
                await pl.runCommandAsync(`kick ${JSON.stringify(pl.name)} ${reason}`);
            } catch (error) {
                // Despawn players from server
                pl.triggerEvent("paradox:kick");
            }
        }
        // Shutting it down
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r Server is in lockdown!`);
        dynamicPropertyRegistry.set("lockdown_b", true);
        world.setDynamicProperty("lockdown_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6Lockdown§r!`);
    }
    //Disable
    if (LockdownToggle === false) {
        dynamicPropertyRegistry.set("lockdown_b", false);
        world.setDynamicProperty("lockdown_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4Lockdown§r!`);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r Server is no longer in lockdown!`);
    }
    return paradoxui;
}

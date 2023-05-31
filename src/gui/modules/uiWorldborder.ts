import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { WorldBorder } from "../../penrose/TickEvent/worldborder/worldborder.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

export function uiWORLDBORDER(worldborderResult: ModalFormResponse, player: Player) {
    const [OverworldValueTextfield, NetherValueTextfield, WorldBorderToggle] = worldborderResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Get Dynamic Property Boolean

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to configure World Borders`);
    }
    if (WorldBorderToggle === true) {
        dynamicPropertyRegistry.set("worldborder_b", true);
        dynamicPropertyRegistry.set("worldborder_n", Math.abs(Number(OverworldValueTextfield)));
        dynamicPropertyRegistry.set("worldborder_nether_n", Math.abs(Number(NetherValueTextfield)));
        world.setDynamicProperty("worldborder_b", true);
        world.setDynamicProperty("worldborder_n", Math.abs(Number(OverworldValueTextfield)));
        world.setDynamicProperty("worldborder_nether_n", Math.abs(Number(NetherValueTextfield)));
        WorldBorder();
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.name}§r has set the §6World Border§r! Overworld: ${OverworldValueTextfield} Nether: ${NetherValueTextfield}`);
    }
    if (WorldBorderToggle === false) {
        dynamicPropertyRegistry.set("worldborder_b", false);
        dynamicPropertyRegistry.set("worldborder_n", 0);
        dynamicPropertyRegistry.set("worldborder_nether_n", 0);
        world.setDynamicProperty("worldborder_b", false);
        world.setDynamicProperty("worldborder_n", 0);
        world.setDynamicProperty("worldborder_nether_n", 0);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.name}§r has disabled the §6World Border§r!`);
    }

    //show the main ui to the player once complete.
    return paradoxui(player);
}

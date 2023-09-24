import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { WorldBorder } from "../../penrose/TickEvent/worldborder/worldborder.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

export function uiWORLDBORDER(worldborderResult: ModalFormResponse, player: Player) {
    if (!worldborderResult || worldborderResult.canceled) {
        // Handle canceled form or undefined result
        return;
    }
    const [OverworldValueTextfield, NetherValueTextfield, EndValueTextfield, WorldBorderToggle] = worldborderResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Get Dynamic Property Boolean

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to configure World Borders`);
    }
    if (WorldBorderToggle === true) {
        dynamicPropertyRegistry.set("worldborder_b", true);
        dynamicPropertyRegistry.set("worldborder_n", Math.abs(Number(OverworldValueTextfield)));
        dynamicPropertyRegistry.set("worldborder_nether_n", Math.abs(Number(NetherValueTextfield)));
        dynamicPropertyRegistry.set("worldborder_end_n", Math.abs(Number(EndValueTextfield)));
        world.setDynamicProperty("worldborder_b", true);
        world.setDynamicProperty("worldborder_n", Math.abs(Number(OverworldValueTextfield)));
        world.setDynamicProperty("worldborder_nether_n", Math.abs(Number(NetherValueTextfield)));
        world.setDynamicProperty("worldborder_end_n", Math.abs(Number(EndValueTextfield)));
        WorldBorder();
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has set the §6World Border§f! Overworld: §7${OverworldValueTextfield}§f Nether: §7${NetherValueTextfield}§f End: §7${EndValueTextfield}§f`);
    }
    if (WorldBorderToggle === false) {
        dynamicPropertyRegistry.set("worldborder_b", false);
        dynamicPropertyRegistry.set("worldborder_n", 0);
        dynamicPropertyRegistry.set("worldborder_nether_n", 0);
        dynamicPropertyRegistry.set("worldborder_end_n", 0);
        world.setDynamicProperty("worldborder_b", false);
        world.setDynamicProperty("worldborder_n", 0);
        world.setDynamicProperty("worldborder_nether_n", 0);
        world.setDynamicProperty("worldborder_end_n", 0);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has disabled the §6World Border§f!`);
    }

    //show the main ui to the player once complete.
    return paradoxui(player);
}

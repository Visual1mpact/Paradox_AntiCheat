import { Player, world } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import config from "../data/config";
import { crypto } from "../util";
import { uiBAN } from "./moderation/uiBan";
import { uiDEOP } from "./moderation/uiDeop";
import { uiOP } from "./moderation/UIOp";
import { uiUNBAN } from "./moderation/uiUnban";
async function paradoxui(player: Player) {
    await new ActionFormData()

        .title("§4Paradox§4")
        .body("§eA utility to fight against malicious hackers on Bedrock Edition§e")
        .button("§0op§2", "textures/items/ender_eye")
        .button("§0deop§2", "textures/items/ender_pearl")
        .button("§0Moderation§2", "textures/items/book_normal")
        .button("§0Modules§2", "textures/blocks/command_block")
        .show(player)
        .then((result) => {
            let hash = player.getDynamicProperty("hash");
            let salt = player.getDynamicProperty("salt");
            let encode = crypto(salt, config.modules.encryption.password) ?? null;
            if (result.selection === 0) {
                // New window for op
                const opgui = new ModalFormData();
                let onlineList: string[] = [];
                opgui.title("§4OP§4");
                onlineList = Array.from(world.getPlayers(), (player) => player.name);
                opgui.dropdown(`\n  §rSelect a player to give access to Paradox.§r\n\nPlayer's Online\n`, onlineList);
                opgui.show(player).then((opResult) => {
                    uiOP(opResult, salt, hash, encode, onlineList, player);
                });
            }
            if (result.selection === 1) {
                // New window for deop
                const deopgui = new ModalFormData();
                let onlineList: string[] = [];
                deopgui.title("§4DEOP§4");
                onlineList = Array.from(world.getPlayers(), (player) => player.name);
                deopgui.dropdown(`\n  §rSelect a player to remove access to Paradox.§r\n\nPlayer's Online\n`, onlineList);
                deopgui.show(player).then((opResult) => {
                    uiDEOP(opResult, onlineList, player);
                });
            }
            if (result.selection === 2) {
                //new window for Moderation
                const moderationui = new ActionFormData();
                moderationui.title("§4Paradox Moderation§4");
                moderationui.button("Ban", "textures/blocks/barrier");
                moderationui.button("Unban", "textures/ui/check");

                moderationui.show(player).then((ModUIresult) => {
                    if (ModUIresult.selection === 0) {
                        //show ban ui here
                        const banui = new ModalFormData();
                        let onlineList: string[] = [];

                        banui.title("§4Ban A player!§4");
                        onlineList = Array.from(world.getPlayers(), (player) => player.name);
                        banui.dropdown(`\n  §rSelect a player to Ban.§r\n\nPlayer's Online\n`, onlineList);
                        banui.textField(`Reason`, `Enter a reason as to why they have been banned.`);
                        banui.show(player).then((banResult) => {
                            //ban function goes here
                            uiBAN(banResult, onlineList, player);
                        });
                    }
                    if (ModUIresult.selection === 1) {
                        //show unban ui here
                        const unbanui = new ModalFormData();
                        unbanui.title("§4Unban A player!§4");
                        unbanui.textField(`Player`, `Enter a players username to be unbanned.`);
                        unbanui.show(player).then((unbanResult) => {
                            uiUNBAN(unbanResult, player);
                        });
                    }
                });
            }

            // We looping here so don't mind me while I dance a little
            if (result.canceled && result.cancelationReason === "userBusy") {
                /**
                 * Continue to call the function with the player object
                 * until the user is no longer busy. This should mean
                 * they do not have a GUI open and we can now show this form.
                 */
                paradoxui(player);
            }
        });
}

export { paradoxui };

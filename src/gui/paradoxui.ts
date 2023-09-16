import { Player } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../penrose/WorldInitializeAfterEvent/registry";
import versionFile from "../version.js";
import { opHandler } from "./guiHandler/results/op";
import { tprHandler } from "./guiHandler/results/tpr";
import { deopHandler } from "./guiHandler/results/deop";
import { locationHandler } from "./guiHandler/results/location";
import { moderationui } from "./guiHandler/guiHandlerModeration/moderationui";
import { reportHandler } from "./guiHandler/results/report";
import { modulesui } from "./guiHandler/guiHandlerModules/modulesui";
import { prefixHandler } from "./guiHandler/results/prefix";
import { statsHandler } from "./guiHandler/results/stats";
import { chatChannelMainMenu } from "./guiHandler/results/chatChannelsMenu";
import { managePlayerSavedLocationsHandler } from "./guiHandler/guiHandlerModeration/results/managePlayersSavedLocations";

/**
 * @name paradoxui
 * @param {Player} player - Player object
 */
export function paradoxui(player: Player) {
    handleParadoxUI(player).catch((error) => {
        console.error("Paradox Unhandled Rejection: ", error);
        // Extract stack trace information
        if (error instanceof Error) {
            const stackLines = error.stack.split("\n");
            if (stackLines.length > 1) {
                const sourceInfo = stackLines;
                console.error("Error originated from:", sourceInfo[0]);
            }
        }
    });
}

async function handleParadoxUI(player: Player) {
    const maingui = new ActionFormData();

    const hash = player.getDynamicProperty("hash");
    const salt = player.getDynamicProperty("salt");
    const uniqueId = dynamicPropertyRegistry.get(player?.id);
    maingui.title("§4Paradox§4");
    maingui.body("§eA utility to fight against malicious hackers on Bedrock Edition§e\n" + "§fVersion: §2" + versionFile.version);
    if (uniqueId !== player.name) {
        maingui.button("Op", "textures/ui/op");
        maingui.button("Teleport Requests", "textures/blocks/portal_placeholder");
        maingui.button("Saved Locations", "textures/items/compass_item");
        maingui.button("Report", "textures/items/paper");
        maingui.button("Chat Channels", "textures/ui/mute_off");
    } else {
        maingui.button("Op", "textures/ui/op");
        maingui.button("Deop", "textures/items/ender_pearl");
        maingui.button("Moderation", "textures/items/book_normal");
        maingui.button("Modules", "textures/blocks/command_block");
        maingui.button("Prefix", "textures/ui/UpdateGlyph");
        maingui.button("Teleport Requests", "textures/blocks/portal_placeholder");
        maingui.button("Saved Locations", "textures/items/compass_item");
        maingui.button("Stats", "textures/items/book_normal");
        maingui.button("Chat Channels", "textures/ui/mute_off");
        maingui.button("Manage Players Saved Locations", "textures/items/compass_item");
    }
    maingui
        .show(player)
        .then((result) => {
            const isUnique = uniqueId !== player.name;

            if (isUnique) {
                switch (result.selection) {
                    case 0:
                        opHandler(player, uniqueId as string, salt as string, hash as string);
                        break;
                    case 1:
                        tprHandler(player);
                        break;
                    case 2:
                        locationHandler(player);
                        break;
                    case 3:
                        reportHandler(player);
                        break;
                    case 4:
                        chatChannelMainMenu(player);
                        break;
                    default:
                        // Handle other selections for isUnique case
                        break;
                }
            } else {
                switch (result.selection) {
                    case 0:
                        opHandler(player, uniqueId as string, salt as string, hash as string);
                        break;
                    case 1:
                        deopHandler(player);
                        break;
                    case 2:
                        moderationui(player);
                        break;
                    case 3:
                        modulesui(player);
                        break;
                    case 4:
                        prefixHandler(player);
                        break;
                    case 5:
                        tprHandler(player);
                        break;
                    case 6:
                        locationHandler(player);
                        break;
                    case 7:
                        statsHandler(player);
                        break;
                    case 8:
                        chatChannelMainMenu(player);
                        break;
                    case 9:
                        managePlayerSavedLocationsHandler(player);
                        break;
                    default:
                        // Handle other selections for non-isUnique case
                        break;
                }
            }

            if (result.canceled && result.cancelationReason === "UserBusy") {
                paradoxui(player);
            }
        })
        .catch((error) => {
            console.error("Paradox Unhandled Rejection: ", error);
            // Extract stack trace information
            if (error instanceof Error) {
                const stackLines = error.stack.split("\n");
                if (stackLines.length > 1) {
                    const sourceInfo = stackLines;
                    console.error("Error originated from:", sourceInfo[0]);
                }
            }
        });
}

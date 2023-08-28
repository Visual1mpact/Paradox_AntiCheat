import { Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { getScore } from "../../../../util";
import { uiCOMMANDBLOCKS } from "../../../modules/uiCommandBlocks";

export function commandBlocksHandler(player: Player) {
    const modulescommandblocksui = new ModalFormData();
    const cmdsscore = getScore("cmds", player);
    const commandblocksscore = getScore("commandblocks", player);
    let removecmdblocksBoolean;
    Boolean;
    let cmdoBoolean: boolean;
    if (cmdsscore <= 0) {
        cmdoBoolean = false;
    }
    if (cmdsscore >= 1) {
        cmdoBoolean = true;
    }
    if (commandblocksscore <= 0) {
        removecmdblocksBoolean = false;
    }
    if (commandblocksscore >= 1) {
        removecmdblocksBoolean = true;
    }
    modulescommandblocksui.title("§4Paradox Modules - Command Blocks§4");
    modulescommandblocksui.toggle("Override Command Blocks - Forces the commandblocksenabled gamerule to be enabled or disabled at all times:", cmdoBoolean);
    modulescommandblocksui.toggle("Anti Command Blocks - Clears all Command Blocks when enabled:", removecmdblocksBoolean);
    modulescommandblocksui
        .show(player)
        .then((commandblockResult) => {
            uiCOMMANDBLOCKS(commandblockResult, player);
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

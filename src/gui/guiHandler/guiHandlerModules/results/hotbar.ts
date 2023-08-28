import { Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../../../penrose/WorldInitializeAfterEvent/registry";
import config from "../../../../data/config";
import { uiHOTBAR } from "../../../modules/uiHotbar";

export function hotbarHandler(player: Player) {
    const moduleshotbarui = new ModalFormData();
    const hotbarBoolean = dynamicPropertyRegistry.get("hotbar_b") as boolean;
    const CurrentHotbarConfig = config.modules.hotbar.message;
    moduleshotbarui.title("§4Paradox Modules - Hotbar§4");
    moduleshotbarui.textField("Hotbar Message: ", "", CurrentHotbarConfig);
    moduleshotbarui.toggle("Enable Hotbar - Displays a hotbar message for all player's currently online:", hotbarBoolean);
    moduleshotbarui.toggle("Restore to message stored in config.js:", false);
    moduleshotbarui
        .show(player)
        .then((hotbarResult) => {
            uiHOTBAR(hotbarResult, player);
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

import { Player } from "@minecraft/server";
import { dynamicPropertyRegistry } from "../../../../penrose/WorldInitializeAfterEvent/registry";
import { ModalFormData } from "@minecraft/server-ui";
import { uiAUTOBAN } from "../../../moderation/uiAutoBan";

export function autobanHandler(player: Player) {
    const autoBanBoolean = dynamicPropertyRegistry.get("autoban_b") as boolean;
    const autobanui = new ModalFormData();
    autobanui.title("§4Paradox - Auto Ban§4");
    autobanui.toggle("Enable or disable auto ban:", autoBanBoolean);
    autobanui
        .show(player)
        .then((autobanResult) => {
            uiAUTOBAN(autobanResult, player);
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

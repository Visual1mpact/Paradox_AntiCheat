import { Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../../../../penrose/WorldInitializeAfterEvent/registry";
import { uiSPEED } from "../../../../modules/uiSpeed";

export function speedAHandler(player: Player) {
    //SpeedA
    const modulesnoslowui = new ModalFormData();
    const speedABoolean = dynamicPropertyRegistry.get("speeda_b") as boolean;
    modulesnoslowui.title("§4Paradox Modules - Speed§4");
    modulesnoslowui.toggle("Speed - Checks for player's speed hacking:", speedABoolean);
    modulesnoslowui
        .show(player)
        .then((invalidsprintResult) => {
            uiSPEED(invalidsprintResult, player);
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

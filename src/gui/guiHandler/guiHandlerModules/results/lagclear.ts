import { Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../../../penrose/WorldInitializeAfterEvent/registry";
import { uiLAGCLEAR } from "../../../modules/uiLagClear";

export function lagClearHandler(player: Player) {
    //Lagclear
    const moduleslaglearui = new ModalFormData();
    const clearLagBoolean = dynamicPropertyRegistry.get("clearlag_b") as boolean;
    moduleslaglearui.title("§4Paradox Modules - Clear Lag§4");
    moduleslaglearui.toggle("Clear Lag - Clears items and entities with timer:", clearLagBoolean);
    moduleslaglearui
        .show(player)
        .then((lagclearResult) => {
            uiLAGCLEAR(lagclearResult, player);
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

import { Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { uiINVALIDSPRINT } from "../../../../modules/uiInvalidSprint";
import { dynamicPropertyRegistry } from "../../../../../penrose/WorldInitializeAfterEvent/registry";

export function invalidSprintHandler(player: Player) {
    //Invalid Sprint
    const modulesinvalidsprintui = new ModalFormData();
    const invalidSprintABoolean = dynamicPropertyRegistry.get("invalidsprinta_b") as boolean;
    modulesinvalidsprintui.title("§4Paradox Modules - Invalid Sprint§4");
    modulesinvalidsprintui.toggle("Invalid Sprint - Checks for illegal sprinting with blindness effect:", invalidSprintABoolean);
    modulesinvalidsprintui
        .show(player)
        .then((invalidsprintResult) => {
            uiINVALIDSPRINT(invalidsprintResult, player);
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

import { Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../../../penrose/WorldInitializeAfterEvent/registry";
import { uiANTICRASHER } from "../../../modules/uiAntiCrasher";

export function antiCrasherHandler(player: Player) {
    const modulesanticrasherui = new ModalFormData();
    const crasherABoolean = dynamicPropertyRegistry.get("crashera_b") as boolean;
    modulesanticrasherui.title("§4Paradox Modules - Anti Crasher§4");
    modulesanticrasherui.toggle("Anti Crasher - Checks for the infamous Horion Crasher:", crasherABoolean);
    modulesanticrasherui
        .show(player)
        .then((anticrasherResult) => {
            uiANTICRASHER(anticrasherResult, player);
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

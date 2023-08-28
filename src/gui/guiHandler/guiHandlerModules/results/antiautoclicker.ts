import { Player } from "@minecraft/server";
import { dynamicPropertyRegistry } from "../../../../penrose/WorldInitializeAfterEvent/registry";
import { uiANTIAUTOCLICKER } from "../../../modules/uiAntiAutoClicker";
import { ModalFormData } from "@minecraft/server-ui";

export function antiAutoClickerHandler(player: Player) {
    const autoClickerBoolean = dynamicPropertyRegistry.get("autoclicker_b") as boolean;
    const modulesantiautoclickerui = new ModalFormData();
    modulesantiautoclickerui.title("§4Paradox Modules - Anti AutoClicker§4");
    modulesantiautoclickerui.toggle("Anti AutoClicker - Checks for players using autoclickers while attacking:", autoClickerBoolean);
    modulesantiautoclickerui
        .show(player)
        .then((antiautoclickerResult) => {
            uiANTIAUTOCLICKER(antiautoclickerResult, player);
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

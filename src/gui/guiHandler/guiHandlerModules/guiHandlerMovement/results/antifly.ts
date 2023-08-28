import { Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../../../../penrose/WorldInitializeAfterEvent/registry";
import { uiANTIFLY } from "../../../../modules/uiAntiFly";

export function antiFlyHandler(player: Player) {
    //Anti Fly
    const modulesantiflyui = new ModalFormData();
    const flyABoolean = dynamicPropertyRegistry.get("flya_b") as boolean;
    modulesantiflyui.title("§4Paradox Modules - Anti Fly§4");
    modulesantiflyui.toggle("Anti Fly - Checks for illegal flying in survival:", flyABoolean);
    modulesantiflyui
        .show(player)
        .then((antiflyResult) => {
            uiANTIFLY(antiflyResult, player);
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

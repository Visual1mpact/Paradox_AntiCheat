import { Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../../../penrose/WorldInitializeAfterEvent/registry";
import { uiANTINUKER } from "../../../modules/uiAntiNuker";

export function antiNukerAHandler(player: Player) {
    const modulesantinukerui = new ModalFormData();
    const antiNukerABoolean = dynamicPropertyRegistry.get("antinukera_b") as boolean;
    modulesantinukerui.title("§4Paradox Modules - Anti Nuker§4");
    modulesantinukerui.toggle("Anti Nuker - Checks player's for nuking blocks:", antiNukerABoolean);
    modulesantinukerui
        .show(player)
        .then((antinukerResult) => {
            uiANTINUKER(antinukerResult, player);
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

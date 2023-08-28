import { Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../../../penrose/WorldInitializeAfterEvent/registry";
import { uiSPAMMER } from "../../../modules/uiSpammer";

export function spammersHandler(player: Player) {
    const modulesspamui = new ModalFormData();
    const spammerABoolean = dynamicPropertyRegistry.get("spammera_b") as boolean;
    const spammerBBoolean = dynamicPropertyRegistry.get("spammerb_b") as boolean;
    const spammerCBoolean = dynamicPropertyRegistry.get("spammerc_b") as boolean;
    modulesspamui.title("§4Paradox Modules - Spam Modules§4");
    modulesspamui.toggle("Spammer A - Checks for messages sent while moving:", spammerABoolean);
    modulesspamui.toggle("Spammer B - Checks for messages sent while swinging:", spammerBBoolean);
    modulesspamui.toggle("Spammer C - Checks for messages sent while using items:", spammerCBoolean);
    modulesspamui
        .show(player)
        .then((spamResult) => {
            uiSPAMMER(spamResult, player);
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

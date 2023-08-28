import { Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../../../penrose/WorldInitializeAfterEvent/registry";
import { uiNAMESPOOFING } from "../../../modules/uiNameSpoofing";

export function nameSpoofHandler(player: Player) {
    //Namespoofing
    const modulesnamespoofingui = new ModalFormData();
    const nameSpoofABoolean = dynamicPropertyRegistry.get("namespoofa_b") as boolean;
    const nameSpoofBBoolean = dynamicPropertyRegistry.get("namespoofb_b") as boolean;
    modulesnamespoofingui.title("§4Paradox Modules - Name spoofing§4");
    modulesnamespoofingui.toggle("Name Spoofing A - Checks for player's name exceeding character limitations:", nameSpoofABoolean);
    modulesnamespoofingui.toggle("Name Spoofing B - Checks for player's name that has Non ASCII characters:", nameSpoofBBoolean);
    modulesnamespoofingui
        .show(player)
        .then((namespoofingResult) => {
            uiNAMESPOOFING(namespoofingResult, player);
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

import { Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { uiBADPACKETS } from "../../../modules/uiBadpackets";
import { dynamicPropertyRegistry } from "../../../../penrose/WorldInitializeAfterEvent/registry";

export function badPacketsHandler(player: Player) {
    const modulesbadpacketsui = new ModalFormData();
    const badPackets1Boolean = dynamicPropertyRegistry.get("badpackets1_b") as boolean;
    const badPackets2Boolean = dynamicPropertyRegistry.get("badpackets2_b") as boolean;
    modulesbadpacketsui.title("§4Paradox Modules - Badpackets§4");
    modulesbadpacketsui.toggle("Badpackets1 - Checks for message lengths with each broadcast:", badPackets1Boolean);
    modulesbadpacketsui.toggle("Badpackets2 - Checks for invalid selected slots by player:", badPackets2Boolean);
    modulesbadpacketsui
        .show(player)
        .then((badpacketsResult) => {
            uiBADPACKETS(badpacketsResult, player);
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

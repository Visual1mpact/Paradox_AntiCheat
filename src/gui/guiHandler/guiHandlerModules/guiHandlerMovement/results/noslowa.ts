import { Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../../../../penrose/WorldInitializeAfterEvent/registry";
import { uiNOWSLOW } from "../../../../modules/uiNowslow";

export function noSlowAHandler(player: Player) {
    //NoSlowA
    const modulesnoslowui = new ModalFormData();
    const noSlowBoolean = dynamicPropertyRegistry.get("noslowa_b") as boolean;
    modulesnoslowui.title("§4Paradox Modules - Noslow§4");
    modulesnoslowui.toggle("Noslow - Checks for player's speed hacking:", noSlowBoolean);
    modulesnoslowui.show(player).then((invalidsprintResult) => {
        uiNOWSLOW(invalidsprintResult, player);
    });
}

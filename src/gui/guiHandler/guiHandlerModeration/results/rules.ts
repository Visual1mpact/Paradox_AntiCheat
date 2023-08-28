import { ModalFormData } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../../../penrose/WorldInitializeAfterEvent/registry";
import { uiRULES } from "../../../moderation/uiRules";
import { Player } from "@minecraft/server";

export function rulesHandler(player: Player) {
    //show rules ui
    const rulesui = new ModalFormData();
    rulesui.title("§4Paradox - Configure Rules§4");
    const showrulesBoolean = dynamicPropertyRegistry.get("showrules_b") as boolean;
    const KickOnDeclineBoolean = dynamicPropertyRegistry.get("kickondecline_b") as boolean;
    rulesui.toggle("Enable Rules:", showrulesBoolean);
    rulesui.toggle("Kick On Decline:", KickOnDeclineBoolean);
    rulesui.show(player).then((rulesResult) => {
        // due to limitations we can't edit the rules in game.
        uiRULES(rulesResult, player);
    });
}

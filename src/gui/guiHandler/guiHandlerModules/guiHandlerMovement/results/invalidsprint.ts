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
    modulesinvalidsprintui.show(player).then((invalidsprintResult) => {
        uiINVALIDSPRINT(invalidsprintResult, player);
    });
}

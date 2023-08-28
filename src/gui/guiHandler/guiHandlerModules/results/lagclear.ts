import { Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../../../penrose/WorldInitializeAfterEvent/registry";
import { uiLAGCLEAR } from "../../../modules/uiLagClear";

export function lagClearHandler(player: Player) {
    //Lagclear
    const moduleslaglearui = new ModalFormData();
    const clearLagBoolean = dynamicPropertyRegistry.get("clearlag_b") as boolean;
    moduleslaglearui.title("§4Paradox Modules - Clear Lag§4");
    moduleslaglearui.toggle("Clear Lag - Clears items and entities with timer:", clearLagBoolean);
    moduleslaglearui.show(player).then((lagclearResult) => {
        uiLAGCLEAR(lagclearResult, player);
    });
}

import { Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../../../penrose/WorldInitializeAfterEvent/registry";
import { uiEXPSALVAGESYSTEM } from "../../../modules/uiExpSalvageSystem";

export function salvageHandler(player: Player) {
    //New Slavage System
    const modulesexpsavlagesystem = new ModalFormData();
    const salvageBoolean = dynamicPropertyRegistry.get("salvage_b") as boolean;
    modulesexpsavlagesystem.title("§4Paradox Modules - Salvage System§4");
    modulesexpsavlagesystem.toggle("Salvage System - Salvage all item's:", salvageBoolean);
    modulesexpsavlagesystem.show(player).then((salvagesystemResult) => {
        uiEXPSALVAGESYSTEM(salvagesystemResult, player);
    });
}

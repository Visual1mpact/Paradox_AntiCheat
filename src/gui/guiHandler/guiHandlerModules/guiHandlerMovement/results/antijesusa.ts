import { Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../../../../penrose/WorldInitializeAfterEvent/registry";
import { uiANTIJESUS } from "../../../../modules/uiAntiJesus";

export function antiJesusAHandler(player: Player) {
    //Jesus UI
    const modulesantijesusui = new ModalFormData();
    const jesusaBoolean = dynamicPropertyRegistry.get("jesusa_b") as boolean;
    modulesantijesusui.title("§4Paradox Modules - Anti Jesus§4");
    modulesantijesusui.toggle("Anti Jesus - Toggles checks for walking/sprinting on water or lava:", jesusaBoolean);
    modulesantijesusui.show(player).then((antijesusResult) => {
        uiANTIJESUS(antijesusResult, player);
    });
}

import { Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../../../penrose/WorldInitializeAfterEvent/registry";
import { uiGAMEMODES } from "../../../modules/uiGamemodes";

export function gamemodesHandler(player: Player) {
    //GameModes UI
    const gamemodesui = new ModalFormData();
    const adventureGMBoolean = dynamicPropertyRegistry.get("adventuregm_b") as boolean;
    const creativeGMBoolean = dynamicPropertyRegistry.get("creativegm_b") as boolean;
    const survivalGMBoolean = dynamicPropertyRegistry.get("survivalgm_b") as boolean;
    gamemodesui.title("§4Paradox - Configure Gamemodes§4");
    gamemodesui.toggle("Disable Adventure:", adventureGMBoolean);
    gamemodesui.toggle("Disable Creative:", creativeGMBoolean);
    gamemodesui.toggle("Disable Survival:", survivalGMBoolean);
    gamemodesui.show(player).then((gamemodeResult) => {
        uiGAMEMODES(gamemodeResult, player);
    });
}

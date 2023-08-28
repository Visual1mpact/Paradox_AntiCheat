import { Player } from "@minecraft/server";
import { dynamicPropertyRegistry } from "../../../../penrose/WorldInitializeAfterEvent/registry";
import { ModalFormData } from "@minecraft/server-ui";
import { uiAUTOBAN } from "../../../moderation/uiAutoBan";

export function autobanHandler(player: Player) {
    const autoBanBoolean = dynamicPropertyRegistry.get("autoban_b") as boolean;
    const autobanui = new ModalFormData();
    autobanui.title("§4Paradox - Auto Ban§4");
    autobanui.toggle("Enable or disable auto ban:", autoBanBoolean);
    autobanui.show(player).then((autobanResult) => {
        uiAUTOBAN(autobanResult, player);
    });
}

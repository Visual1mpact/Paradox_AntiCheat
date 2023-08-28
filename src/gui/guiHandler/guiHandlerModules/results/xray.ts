import { Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../../../penrose/WorldInitializeAfterEvent/registry";
import { uiXRAY } from "../../../modules/uiXray";

export function xrayHandler(player: Player) {
    const modulesxtrayui = new ModalFormData();
    modulesxtrayui.title("§4Paradox Modules - Xray§4");
    const xrayBoolean = dynamicPropertyRegistry.get("xraya_b") as boolean;
    modulesxtrayui.toggle("Xray - Notify's staff when and where player's mine specific ores:", xrayBoolean);
    modulesxtrayui.show(player).then((xrayResult) => {
        uiXRAY(xrayResult, player);
    });
}

import { Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../../../../penrose/WorldInitializeAfterEvent/registry";
import { uiANTISCAFFOLD } from "../../../../modules/uiAntiScaffold";

export function antiScaffoldAHandler(player: Player) {
    //AntiScaffold
    const modulesantiscaffoldui = new ModalFormData();
    const antiScaffoldABoolean = dynamicPropertyRegistry.get("antiscaffolda_b") as boolean;
    modulesantiscaffoldui.title("§4Paradox Modules - Anti Scaffold§4");
    modulesantiscaffoldui.toggle("Anti Scaffold - Checks player's for illegal scaffolding:", antiScaffoldABoolean);
    modulesantiscaffoldui.show(player).then((antiscaffoldResult) => {
        uiANTISCAFFOLD(antiscaffoldResult, player);
    });
}

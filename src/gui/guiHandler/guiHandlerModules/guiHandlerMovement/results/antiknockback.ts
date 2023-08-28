import { Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../../../../penrose/WorldInitializeAfterEvent/registry";
import { uiANTIKNOCKBACK } from "../../../../modules/uiAntiKnockback";

export function antiKnockBackHandler(player: Player) {
    //Anti Knockback UI
    const modulesantiknockbackui = new ModalFormData();
    const antikbBoolean = dynamicPropertyRegistry.get("antikb_b") as boolean;
    modulesantiknockbackui.title("§4Paradox Modules - Anti KnockBack§4");
    modulesantiknockbackui.toggle("Anti Knockback - Anti Knockback for all players:", antikbBoolean);
    modulesantiknockbackui.show(player).then((antikbResult) => {
        uiANTIKNOCKBACK(antikbResult, player);
    });
}

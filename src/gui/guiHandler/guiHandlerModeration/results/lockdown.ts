import { Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../../../penrose/WorldInitializeAfterEvent/registry";
import { uiLOCKDOWN } from "../../../moderation/uiLockdown";

export function lockdownHandler(player: Player) {
    //Lockdown ui
    const lockdownui = new ModalFormData();
    // Get Dynamic Property Boolean
    const lockdownBoolean = dynamicPropertyRegistry.get("lockdown_b") as boolean;
    lockdownui.title("§4Paradox - Lockdown§4");
    lockdownui.textField("Reason:", "Possible hacker in the world.");
    lockdownui.toggle("Enable or Disable Lockdown:", lockdownBoolean);
    lockdownui.show(player).then((lockdownResult) => {
        uiLOCKDOWN(lockdownResult, player);
    });
}

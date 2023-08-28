import { Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { uiDESPAWNER } from "../../../moderation/uiDespawner";

export function despawnHandler(player: Player) {
    const despawnerui = new ModalFormData();
    despawnerui.title("§4Paradox - Despawn Entities§4");
    despawnerui.textField("Enter the name of a entity to despawn:", "creeper");
    despawnerui.toggle("Despawn all entities in the loaded chunks:", false);
    despawnerui.show(player).then((despawnerResult) => {
        uiDESPAWNER(despawnerResult, player);
    });
}

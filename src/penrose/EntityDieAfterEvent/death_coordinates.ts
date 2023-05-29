import { world, EntityDieAfterEvent, Player } from "@minecraft/server";
import { sendMsgToPlayer } from "../../util";

function deathcoordinates(event: EntityDieAfterEvent): void {
    const { deadEntity } = event;

    if (!(deadEntity instanceof Player)) {
        return;
    }

    const { x, y, z } = deadEntity.location;

    sendMsgToPlayer(deadEntity, `§r§4[§6Paradox§4]§r You died at X: ${x.toFixed(0)}, Y: ${y.toFixed(0)}, Z: ${z.toFixed(0)}.`);
}

const DeathCoordinates = (): void => {
    world.afterEvents.entityDie.subscribe(deathcoordinates);
};

export { DeathCoordinates };

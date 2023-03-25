// Basic AntiFall might not be needed but here anyway and might be useful to someone else.
//This assumes that the hack keeps the players health at 100.
import { world, Player, EntityHitEvent } from "@minecraft/server";
import config from "../../data/config";

function killaura(obj: EntityHitEvent) {
    // Properties from class
    const { entity, hitBlock, hitEntity } = obj;
    // If a block or not a player entity then ignore
    if (!(hitEntity instanceof Player) || hitBlock !== undefined || !(entity instanceof Player)) {
        return;
    }

    // Execute anything beyond this point
    //console.log("entity attacking: " + entity.nameTag + "entity attacked: " + hitEntity.nameTag);
    //attackers location
    const { x, y, z } = entity.location;
    const { x: vx, y: vy, z: vz } = entity.getVelocity();
    world.sendMessage(`Pos: ${x} ${y} ${z} `);
    world.sendMessage(`Vel: ${vx} ${vy} ${vz}`);
    if (entity.hasTag("attack") && vx == 0 && vz == 0) {
        //flag player!
    }
}

//  }

export const KillAura = () => {
    if (config.debug) {
        world.events.entityHit.subscribe(killaura);
    }
};

import { world, Player, EntityHitEvent } from "@minecraft/server";
import { dynamicPropertyRegistry } from "../worldinitializeevent/registry";
import { flag } from "../../util";
import { kickablePlayers } from "../../kickcheck";

function rip(player: Player) {
    // Reason for hack
    const reason = "KillAura";

    try {
        player.addTag(`Reason:${reason}`);
        player.addTag("By:Paradox");
        player.addTag("isBanned");
    } catch (error) {
        kickablePlayers.add(player);
        player.triggerEvent("paradox:kick");
    }
}

function killaura(obj: EntityHitEvent) {
    // Get Dynamic Property
    const antiKillAuraBoolean = dynamicPropertyRegistry.get("antikillaura_b");

    // Unsubscribe if disabled in-game
    if (antiKillAuraBoolean === false) {
        world.events.entityHit.unsubscribe(killaura);
        return;
    }

    // Properties from class
    const { entity, hitBlock, hitEntity } = obj;

    // If a block or not a player entity then ignore
    if (!(hitEntity instanceof Player) || hitBlock !== undefined || !(entity instanceof Player)) {
        return;
    }

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(entity?.id);

    // Skip if they have permission
    if (uniqueId === entity.name) {
        return;
    }

    // Get the view direction of the attacking entity
    const { x: entityX, y: entityY, z: entityZ } = entity.getViewDirection();

    // Get the location of the hit entity
    const { x: hitX, y: hitY, z: hitZ } = hitEntity.location;

    // Calculate the vector from the attacking entity to the hit entity
    const dx = hitX - entity.location.x;
    const dy = hitY - entity.location.y;
    const dz = hitZ - entity.location.z;

    // Calculate the dot product and magnitudes
    const dotProduct = entityX * dx + entityY * dy + entityZ * dz;
    const entityMagnitude = Math.sqrt(entityX * entityX + entityY * entityY + entityZ * entityZ);
    const vectorMagnitude = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Calculate the angle in radians
    const cosAngle = dotProduct / (entityMagnitude * vectorMagnitude);
    const angle = Math.acos(cosAngle) * (180 / Math.PI);

    if (angle > 90) {
        // Entity is facing hitEntity at an angle greater than 90 degrees
        flag(entity, "KillAura", "A", "Combat", null, null, null, null, false, null);
        // Ban them
        rip(entity);
    }
}

export const KillAura = () => {
    world.events.entityHit.subscribe(killaura);
};

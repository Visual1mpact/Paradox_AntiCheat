import { world, Player, EntityHitAfterEvent } from "@minecraft/server";
import { dynamicPropertyRegistry } from "../WorldInitializeAfterEvent/registry";
import { flag } from "../../util";
import { MinecraftEffectTypes } from "../../node_modules/@minecraft/vanilla-data/lib/index";

function killaura(obj: EntityHitAfterEvent) {
    // Get Dynamic Property
    const antiKillAuraBoolean = dynamicPropertyRegistry.get("antikillaura_b");

    // Unsubscribe if disabled in-game
    if (antiKillAuraBoolean === false) {
        world.afterEvents.entityHit.unsubscribe(killaura);
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

    if (angle > 100) {
        // Entity is facing hitEntity at an angle greater than 90 degrees
        flag(entity, "KillAura", "A", "Combat", null, null, null, null, false);
        // Blindness
        entity.addEffect(MinecraftEffectTypes.Blindness, 1000000, { amplifier: 255, showParticles: true });
        // Mining Fatigue
        entity.addEffect(MinecraftEffectTypes.MiningFatigue, 1000000, { amplifier: 255, showParticles: true });
        // Weakness
        entity.addEffect(MinecraftEffectTypes.Weakness, 1000000, { amplifier: 255, showParticles: true });
        // Slowness
        entity.addEffect(MinecraftEffectTypes.Slowness, 1000000, { amplifier: 255, showParticles: true });
        const boolean = entity.hasTag("freeze");
        if (!boolean) {
            entity.addTag("freeze");
        }
    }
}

export const KillAura = () => {
    world.afterEvents.entityHit.subscribe(killaura);
};

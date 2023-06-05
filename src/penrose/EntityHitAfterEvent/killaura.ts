import { world, Player, EntityHitAfterEvent } from "@minecraft/server";
import { dynamicPropertyRegistry } from "../WorldInitializeAfterEvent/registry";
import { flag } from "../../util";
import { MinecraftEffectTypes } from "../../node_modules/@minecraft/vanilla-data/lib/index";

function isAttackingFromOutsideView(player1: Player, player2: Player) {
    // Calculate the distance between the two players
    const distance = Math.sqrt(Math.pow(player2.location.x - player1.location.x, 2) + Math.pow(player2.location.y - player1.location.y, 2) + Math.pow(player2.location.z - player1.location.z, 2));

    // Check if the distance is greater than or equal to 1.5 blocks
    if (distance >= 2) {
        // Get the view direction vectors of both players
        const player1ViewDir = player1.getViewDirection();
        const player2ViewDir = player2.getViewDirection();

        // Calculate the vector from player1 to player2
        const player1ToPlayer2 = {
            x: player2.location.x - player1.location.x,
            y: player2.location.y - player1.location.y,
            z: player2.location.z - player1.location.z,
        };

        // Calculate the vector from player2 to player1
        const player2ToPlayer1 = {
            x: player1.location.x - player2.location.x,
            y: player1.location.y - player2.location.y,
            z: player1.location.z - player2.location.z,
        };

        // Calculate the dot products
        const dotProduct1 = player1ViewDir.x * player1ToPlayer2.x + player1ViewDir.y * player1ToPlayer2.y + player1ViewDir.z * player1ToPlayer2.z;
        const dotProduct2 = player2ViewDir.x * player2ToPlayer1.x + player2ViewDir.y * player2ToPlayer1.y + player2ViewDir.z * player2ToPlayer1.z;

        // Calculate the magnitudes of the vectors
        const player1ToPlayer2Magnitude = Math.sqrt(player1ToPlayer2.x * player1ToPlayer2.x + player1ToPlayer2.y * player1ToPlayer2.y + player1ToPlayer2.z * player1ToPlayer2.z);
        const player2ToPlayer1Magnitude = Math.sqrt(player2ToPlayer1.x * player2ToPlayer1.x + player2ToPlayer1.y * player2ToPlayer1.y + player2ToPlayer1.z * player2ToPlayer1.z);

        // Normalize the dot products
        const normalizedDotProduct1 = dotProduct1 / (player1ToPlayer2Magnitude * Math.sqrt(player1ViewDir.x * player1ViewDir.x + player1ViewDir.y * player1ViewDir.y + player1ViewDir.z * player1ViewDir.z));
        const normalizedDotProduct2 = dotProduct2 / (player2ToPlayer1Magnitude * Math.sqrt(player2ViewDir.x * player2ViewDir.x + player2ViewDir.y * player2ViewDir.y + player2ViewDir.z * player2ViewDir.z));

        // Convert dot products to angles in degrees
        const angle1 = Math.acos(normalizedDotProduct1) * (180 / Math.PI);
        const angle2 = Math.acos(normalizedDotProduct2) * (180 / Math.PI);

        // Compare angles with the threshold of 90 degrees
        return angle1 > 90 && angle2 > 90;
    }

    return false;
}

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

    const angleBoolean = isAttackingFromOutsideView(entity, hitEntity);

    if (angleBoolean) {
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

import { world, Player, EntityHitEntityAfterEvent } from "@minecraft/server";
import { sendMsg, sendMsgToPlayer } from "../../util.js";
import { MinecraftEffectTypes } from "../../node_modules/@minecraft/vanilla-data/lib/index";

function pvp(obj: EntityHitEntityAfterEvent) {
    // Properties from class
    const { damagingEntity, hitEntity } = obj;
    // If not a player entity then ignore
    if (!(hitEntity instanceof Player) || !(damagingEntity instanceof Player)) {
        return;
    }
    if (hitEntity.hasTag("pvpDisabled")) {
        sendMsgToPlayer(damagingEntity, `§f§4[§6Paradox§4]§f This player has PVP Disabled!`);
        // Add Effects
        const effectsToAdd = [MinecraftEffectTypes.InstantHealth];
        for (const effectType of effectsToAdd) {
            hitEntity.addEffect(effectType, 5, { amplifier: 255, showParticles: false });
        }
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f ${damagingEntity.name}§f has attaked ${hitEntity.name}§f While ${hitEntity.name} has PVP disabled.`);
    }
}
export const PVP = () => {
    world.afterEvents.entityHitEntity.subscribe(pvp);
};

import { world, Player, EntityHitEntityAfterEvent, PlayerLeaveAfterEvent } from "@minecraft/server";
import { sendMsg, sendMsgToPlayer } from "../../util.js";
import { MinecraftEffectTypes } from "../../node_modules/@minecraft/vanilla-data/lib/index";

const pvpData = new Map<string, { counter: number; lastAttackedName: string }>();

function onPlayerLogout(event: PlayerLeaveAfterEvent): void {
    // Remove the player's data from the map when they log off
    const playerId = event.playerId;
    pvpData.delete(playerId);
}

function pvp(obj: EntityHitEntityAfterEvent) {
    const { damagingEntity, hitEntity } = obj;

    if (!(hitEntity instanceof Player) || !(damagingEntity instanceof Player)) {
        return;
    }

    if (hitEntity.hasTag("pvpDisabled")) {
        sendMsgToPlayer(damagingEntity, `§f§4[§6Paradox§4]§f This player has PVP Disabled!`);

        const effectsToAdd = [MinecraftEffectTypes.InstantHealth];
        for (const effectType of effectsToAdd) {
            hitEntity.addEffect(effectType, 5, { amplifier: 255, showParticles: false });
        }

        const hitEntityId = hitEntity.id;
        const pvpDataForHitEntity = pvpData.get(hitEntityId) || { counter: 0, lastAttackedName: "" };

        if (hitEntity.name === pvpDataForHitEntity.lastAttackedName) {
            pvpDataForHitEntity.counter++;
        } else {
            pvpDataForHitEntity.lastAttackedName = hitEntity.name;
            pvpDataForHitEntity.counter = 0;
        }

        if (pvpDataForHitEntity.counter === 10) {
            sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${damagingEntity.name}§f has attacked §7${hitEntity.name}§f while §7${hitEntity.name}§f has PVP disabled.`);
            pvpDataForHitEntity.counter = 0;
        }

        pvpData.set(hitEntityId, pvpDataForHitEntity);
        return;
    }

    if (damagingEntity.hasTag("pvpDisabled")) {
        // Prevent attacking player with PvP disabled
        sendMsgToPlayer(damagingEntity, `§f§4[§6Paradox§4]§f You cannot attack while you have PvP Disabled!`);

        // Heal the player being attacked
        const effectsToAdd = [MinecraftEffectTypes.InstantHealth];
        for (const effectType of effectsToAdd) {
            hitEntity.addEffect(effectType, 5, { amplifier: 255, showParticles: false });
        }
    }
}

export const PVP = () => {
    world.afterEvents.entityHitEntity.subscribe(pvp);
    world.afterEvents.playerLeave.subscribe(onPlayerLogout);
};

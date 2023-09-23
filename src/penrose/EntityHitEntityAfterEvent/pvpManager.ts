import { world, Player, EntityHitEntityAfterEvent, PlayerLeaveAfterEvent, EntityDieAfterEvent } from "@minecraft/server";
import { sendMsg, sendMsgToPlayer } from "../../util.js";
import { MinecraftEffectTypes } from "../../node_modules/@minecraft/vanilla-data/lib/index";

const pvpData = new Map<string, { counter: number; lastAttackedName: string }>();

function punishment(event: EntityDieAfterEvent) {
    const { damageSource, deadEntity } = event;

    const criminal = damageSource.damagingEntity;

    if (deadEntity instanceof Player && criminal instanceof Player && (criminal.hasTag("pvpDisabled") || deadEntity.hasTag("pvpDisabled"))) {
        sendMsgToPlayer(criminal, `§f§4[§6Paradox§4]§f You killed §7${deadEntity.name}§f while pvp was disabled. You were punished!`);
        criminal.kill();
        return;
    }
}

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
    world.afterEvents.entityDie.subscribe(punishment);
    world.afterEvents.entityHitEntity.subscribe(pvp);
    world.afterEvents.playerLeave.subscribe(onPlayerLogout);
};

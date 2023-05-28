import { Entity, world } from "@minecraft/server";

export const kickablePlayers = new WeakSet<Entity>();

world.beforeEvents.dataDrivenEntityTriggerEvent.subscribe((evd) => {
    const { id, entity } = evd;
    if (entity.id !== "minecraft:player" || id !== "paradox:kick") return;
    if (!kickablePlayers.has(entity)) evd.cancel = true;
});

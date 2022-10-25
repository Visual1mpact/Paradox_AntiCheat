import { SimulatedPlayer } from "@minecraft/server-gametest";
import { Block, Entity, Player } from "@minecraft/server";

for (const obj of [Entity, Player, SimulatedPlayer, Block]) {
    const { get: OIdGet } = Object.getOwnPropertyDescriptor(obj.prototype, "typeId") ?? {};
    Object.defineProperty(obj.prototype, "id", { get: OIdGet });
}

import { SimulatedPlayer } from "@minecraft/server-gametest";
import { Block, Entity, IEntityComponent, ItemCooldownComponent, ItemDurabilityComponent, ItemEnchantsComponent, ItemFoodComponent, ItemStack, Player } from "@minecraft/server";

for (const obj of [Entity, Player, SimulatedPlayer, Block, ItemStack, IEntityComponent, Block, ItemFoodComponent, ItemCooldownComponent, ItemEnchantsComponent, ItemDurabilityComponent]) {
    const { get: OIdGet } = Object.getOwnPropertyDescriptor(obj.prototype, "typeId") ?? {};
    Object.defineProperty(obj.prototype, "id", { get: OIdGet });
}

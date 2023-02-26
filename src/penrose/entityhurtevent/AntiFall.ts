// WIP still being tested and not complete yet! WIP
import { world, Player, EntityHurtEvent, IEntityComponent } from "@minecraft/server";
import { flag } from "../../util";

function antifall(obj: EntityHurtEvent) {
    // get the Entity that was hurt
    const entity = obj.hurtEntity;
    // get the damage source that the entity was given
    const damageSrc = obj.damageSource.cause;
    // get the Entity current health value
    const entityhealth = entity.getComponent("minecraft:health");
    //get the value of damage delt to the entity
    const playerdamagedelt = obj.damage;
    //get the player obj so we can tag and fetch names etc

    // If it's not a player then ignore
    if (!(entity instanceof Player)) {
        return;
    }
    //entityhealth.current <= 98 is place holder need to see how hack clients will interact with this event. and currently triggers if a player takes fall damage no matter what this cant be turned off there is not command WIP.
    // @ts-ignore
    if (entity.typeId == "minecraft:player" && damageSrc == "fall" && entityhealth.current <= 98) {
        flag(entity, "AntiFall", "A", "Hack", null, null, null, null, false, null);
    }
}

export const AntiFall = () => {
    world.events.entityHurt.subscribe(antifall);
};

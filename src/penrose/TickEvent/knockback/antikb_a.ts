import { EntityInventoryComponent, world, system } from "@minecraft/server";
import { flag } from "../../../util.js";
import config from "../../../data/config.js";
import { dynamicPropertyRegistry } from "../../WorldInitializeAfterEvent/registry.js";

async function antiknockbacka(id: number) {
    const antikbBoolean = dynamicPropertyRegistry.get("antikb_b");

    if (antikbBoolean === false) {
        system.clearRun(id);
        return;
    }

    const players = world.getPlayers();
    for (const player of players) {
        const uniqueId = dynamicPropertyRegistry.get(player?.id);

        if (uniqueId === player.name) {
            continue;
        }

        const hand = player.selectedSlot;

        const invContainer = player.getComponent("inventory") as EntityInventoryComponent;
        const inventory = invContainer.container;
        const equippedItem = inventory.getItem(hand);

        let defineItem = "";
        if (equippedItem !== undefined) {
            defineItem = equippedItem.typeId;
        }

        if (defineItem === "minecraft:trident") {
            continue;
        }

        const velocity = player.getVelocity();
        const velocitySum = Math.abs(velocity.y) + Math.abs(velocity.x) + Math.abs(velocity.z);

        if (velocitySum <= config.modules.antikbA.magnitude) {
            const tags = player.getTags();
            if (tags.includes("attacked") && !tags.includes("dead") && !player.isGliding && !tags.includes("levitating") && !tags.includes("flying")) {
                flag(player, "AntiKB", "A", "Movement", null, null, "Magnitude", velocitySum.toFixed(3), true);
            }
        }
    }
}

export function AntiKnockbackA() {
    const antiKnockbackAId = system.runInterval(() => {
        antiknockbacka(antiKnockbackAId).catch((error) => {
            console.error("Paradox Unhandled Rejection: ", error);
            if (error instanceof Error) {
                const stackLines = error.stack.split("\n");
                if (stackLines.length > 1) {
                    const sourceInfo = stackLines;
                    console.error("Error originated from:", sourceInfo[0]);
                }
            }
        });
    }, 40);
}

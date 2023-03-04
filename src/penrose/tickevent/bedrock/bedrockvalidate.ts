import { world, system } from "@minecraft/server";
import config from "../../../data/config.js";
import { crypto } from "../../../util.js";
import { dynamicPropertyRegistry } from "../../worldinitializeevent/registry.js";

const World = world;

async function bedrockvalidate(id: number) {
    // Get Dynamic Property
    const bedrockValidateBoolean = dynamicPropertyRegistry.get("bedrockvalidate_b");

    // Unsubscribe if disabled in-game
    if (bedrockValidateBoolean === false) {
        system.clearRunSchedule(id);
        return;
    }
    // run as each player
    for (const player of World.getPlayers()) {
        // Check for hash/salt and validate password
        const hash = player.getDynamicProperty("hash");
        const salt = player.getDynamicProperty("salt");
        let encode: string;
        try {
            encode = crypto(salt, config.modules.encryption.password);
        } catch (error) {}
        if (hash !== undefined && encode === hash) {
            continue;
        }
        // bedrock validation
        if (player.dimension === World.getDimension("overworld") && config.modules.bedrockValidate.overworld) {
            try {
                await player.runCommandAsync(`fill ~-20 -64 ~-20 ~20 -64 ~20 bedrock`);
            } catch (error) {}
        }

        if (player.dimension === World.getDimension("nether") && config.modules.bedrockValidate.nether) {
            try {
                await player.runCommandAsync(`fill ~-10 0 ~-10 ~10 0 ~10 bedrock`);
            } catch (error) {}

            try {
                await player.runCommandAsync(`fill ~-10 127 ~-10 ~10 127 ~10 bedrock`);
            } catch (error) {}

            try {
                await player.runCommandAsync(`fill ~-5 5 ~-5 ~5 120 ~5 air 0 replace bedrock`);
            } catch (error) {}
        }
    }
}

/**
 * We store the identifier in a variable
 * to cancel the execution of this scheduled run
 * if needed to do so.
 */
export function BedrockValidate() {
    const bedrockValidateId = system.runSchedule(() => {
        bedrockvalidate(bedrockValidateId);
    }, 20);
}

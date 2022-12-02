import { world } from "@minecraft/server";
import { clearTickInterval, setTickInterval } from "../../../libs/scheduling.js";
import config from "../../../data/config.js";
import { crypto } from "../../../util.js";

const World = world;

function bedrockvalidate(id: number) {
    // Get Dynamic Property
    let bedrockValidateBoolean = World.getDynamicProperty("bedrockvalidate_b");
    if (bedrockValidateBoolean === undefined) {
        bedrockValidateBoolean = config.modules.bedrockValidate.enabled;
    }
    // Unsubscribe if disabled in-game
    if (bedrockValidateBoolean === false) {
        clearTickInterval(id);
        return;
    }
    // run as each player
    for (let player of World.getPlayers()) {
        // Check for hash/salt and validate password
        let hash = player.getDynamicProperty("hash");
        let salt = player.getDynamicProperty("salt");
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
                player.runCommandAsync(`fill ~-20 -64 ~-20 ~20 -64 ~20 bedrock`);
            } catch (error) {}
        }

        if (player.dimension === World.getDimension("nether") && config.modules.bedrockValidate.nether) {
            try {
                player.runCommandAsync(`fill ~-10 0 ~-10 ~10 0 ~10 bedrock`);
            } catch (error) {}

            try {
                player.runCommandAsync(`fill ~-10 127 ~-10 ~10 127 ~10 bedrock`);
            } catch (error) {}

            try {
                player.runCommandAsync(`fill ~-5 5 ~-5 ~5 120 ~5 air 0 replace bedrock`);
            } catch (error) {}
        }
    }
}

const BedrockValidate = () => {
    // Executes every 1 second
    const id = setTickInterval(() => bedrockvalidate(id), 20);
};

export { BedrockValidate };

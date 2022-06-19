import { world } from "mojang-minecraft";
import { setTickInterval } from "../../../timer/scheduling.js";
import config from "../../../data/config.js";

const World = world;

function bedrockvalidate() {
    // Get Dynamic Property
    let bedrockValidateBoolean = World.getDynamicProperty('bedrockvalidate_b');
    if (bedrockValidateBoolean === undefined) {
        bedrockValidateBoolean = config.modules.bedrockValidate.enabled;
    }
    // Unsubscribe if disabled in-game
    if (bedrockValidateBoolean === false) {
        World.events.tick.unsubscribe(bedrockvalidate);
        return;
    }
    // run as each player
    for (let player of World.getPlayers()) {
        // bedrock validation
        if (player.dimension === World.getDimension("overworld") && config.modules.bedrockValidate.overworld) {
            try {
                player.runCommand(`fill ~-20 -64 ~-20 ~20 -64 ~20 bedrock`);
            } catch (error) {}
        }

        if (player.dimension === World.getDimension("nether") && config.modules.bedrockValidate.nether) {
                try {
                    player.runCommand(`fill ~-10 0 ~-10 ~10 0 ~10 bedrock`);
                } catch (error) {}

                try {
                    player.runCommand(`fill ~-10 127 ~-10 ~10 127 ~10 bedrock`);
                } catch (error) {}

                try {
                    player.runCommand(`fill ~-5 5 ~-5 ~5 120 ~5 air 0 replace bedrock`);
                } catch (error) {}
        }
    }
}

const BedrockValidate = () => {
    // Executes every 1 second
    setTickInterval(() => bedrockvalidate(),20); 
};

export { BedrockValidate };
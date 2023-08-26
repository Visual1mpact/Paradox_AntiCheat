import { world, system, Dimension } from "@minecraft/server";
import config from "../../../data/config.js";
import { dynamicPropertyRegistry } from "../../WorldInitializeAfterEvent/registry.js";

interface DimensionConfig {
    dimension: Dimension;
    command1: string;
    command2: string;
    command3?: string;
    config: boolean;
}

interface Dimensions {
    overworld: DimensionConfig;
    nether: DimensionConfig;
}

async function bedrockvalidate(id: number) {
    const bedrockValidateBoolean = dynamicPropertyRegistry.get("bedrockvalidate_b");

    if (bedrockValidateBoolean === false) {
        system.clearRun(id);
        return;
    }

    const dimensions: Dimensions = {
        overworld: {
            dimension: world.getDimension("overworld"),
            command1: "fill ~-5 -64 ~-5 ~5 -64 ~5 bedrock",
            command2: "fill ~-4 -59 ~-4 ~4 319 ~4 air [] replace bedrock",
            command3: undefined,
            config: config.modules.bedrockValidate.overworld,
        },
        nether: {
            dimension: world.getDimension("nether"),
            command1: "fill ~-5 0 ~-5 ~5 0 ~5 bedrock",
            command2: "fill ~-5 127 ~-5 ~5 127 ~5 bedrock",
            command3: "fill ~-5 5 ~-5 ~5 120 ~5 air [] replace bedrock",
            config: config.modules.bedrockValidate.nether,
        },
    };

    const players = world.getPlayers();
    for (const player of players) {
        const uniqueId = dynamicPropertyRegistry.get(player?.id);

        if (uniqueId === player.name) {
            continue;
        }

        for (const { dimension, command1, command2, command3, config } of Object.values(dimensions)) {
            if (player?.dimension === dimension && config) {
                await Promise.all([player?.runCommandAsync(command1), player?.runCommandAsync(command2), command3 && player?.runCommandAsync(command3)]);
            }
        }
    }
}

/**
 * We store the identifier in a variable
 * to cancel the execution of this scheduled run
 * if needed to do so.
 */
export function BedrockValidate() {
    const bedrockValidateId = system.runInterval(() => {
        bedrockvalidate(bedrockValidateId).catch((error) => {
            console.error("Paradox Unhandled Rejection: ", error);
            // Extract stack trace information
            if (error instanceof Error) {
                const stackLines = error.stack.split("\n");
                if (stackLines.length > 1) {
                    const sourceInfo = stackLines;
                    console.error("Error originated from:", sourceInfo[0]);
                }
            }
        });
    }, 20);
}

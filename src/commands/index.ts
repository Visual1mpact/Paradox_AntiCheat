// index.ts (in commands directory)
import { CommandHandler } from "../classes/CommandHandler";
import { system, world } from "@minecraft/server";
import { secretKey } from "../security/generateRandomKey";
import { opCommand } from "./moderation/op";
import { MinecraftEnvironment } from "../classes/container/Dependencies";

let checkKey = world.getDynamicProperty("securityKey");
if (!checkKey || typeof checkKey !== "string") {
    world.setDynamicProperty("securityKey", secretKey);
}

checkKey = null;

const minecraftEnvironment = MinecraftEnvironment.getInstance(world, system);
const commandHandler = new CommandHandler(world.getDynamicProperty("securityKey") as string, minecraftEnvironment);

// Register commands with the CommandHandler
commandHandler.registerCommand([opCommand]);

export { commandHandler };

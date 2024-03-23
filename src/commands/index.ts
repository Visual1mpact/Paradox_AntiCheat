// index.ts (in commands directory)
import { CommandHandler } from "../classes/CommandHandler";
import { helloCommand } from "./hello";
import { world } from "@minecraft/server";
import { secretKey } from "../security/generateRandomKey";

let checkKey = world.getDynamicProperty("securityKey");
if (!checkKey || typeof checkKey !== "string") {
    world.setDynamicProperty("securityKey", secretKey);
}

checkKey = null;

const commandHandler = new CommandHandler(world.getDynamicProperty("securityKey") as string);

// Register commands with the CommandHandler
commandHandler.registerCommand([helloCommand]);

export { commandHandler };

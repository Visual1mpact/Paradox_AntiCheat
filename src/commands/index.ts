// index.ts (in commands directory)
import { CommandHandler } from "../classes/CommandHandler";
import { helloCommand } from "./hello";

const commandHandler = new CommandHandler();

// Register commands with the CommandHandler
commandHandler.registerCommand(helloCommand);

export { commandHandler };

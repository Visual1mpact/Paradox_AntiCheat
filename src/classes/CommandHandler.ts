// CommandHandler.ts
import { Player, ChatSendAfterEvent } from "@minecraft/server";

export interface Command {
    name: string;
    description: string;
    usage: string;
    execute: (message: ChatSendAfterEvent, args: string[]) => void;
}

export class CommandHandler {
    private commands: Map<string, Command>;

    constructor() {
        this.commands = new Map();
    }

    registerCommand(command: Command) {
        this.commands.set(command.name, command);
    }

    handleCommand(message: ChatSendAfterEvent, player: Player) {
        if (!message.message.startsWith("!")) return;

        const args = message.message.slice(1).trim().split(/ +/);
        const commandName = args.shift()?.toLowerCase();

        if (!commandName) return;

        if (commandName === "help" || args[0]?.toLowerCase() === "help") {
            if (args.length === 0) {
                // Display all commands if only "help" is used
                this.displayAllCommands(player);
                return;
            }

            const specifiedCommandName = commandName === "help" ? args[0] : commandName;
            const commandInfo = this.getCommandInfo(specifiedCommandName);
            player.sendMessage(commandInfo || "\nCommand not found.");
            return;
        }

        const command = this.commands.get(commandName);
        if (command) {
            try {
                command.execute(message, args);
            } catch (error) {
                console.error(error);
                player.sendMessage("\nThere was an error executing that command!");
            }
        } else {
            player.sendMessage(`\nCommand "${commandName}" not found. Use !help to see available commands.`);
        }
    }

    private displayAllCommands(player: Player) {
        let helpMessage = "\nAvailable commands:\n\n";
        this.commands.forEach((command) => {
            helpMessage += `§l${command.name}§r: ${command.description}\n`;
        });
        player.sendMessage(helpMessage);
    }

    private getCommandInfo(commandName: string): string {
        const command = this.commands.get(commandName);
        if (command) {
            return `\n§l${command.name}§r: ${command.description}\n  - ${command.usage}`;
        } else {
            return `\nCommand "${commandName}" not found.`;
        }
    }
}

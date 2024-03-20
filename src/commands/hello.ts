import { Command } from "../classes/CommandHandler";

export const helloCommand: Command = {
    name: "hello",
    description: "Say hello!",
    usage: "!hello",
    execute: (message, args?) => {
        const playerName = message.sender.name;
        const check = args && args.length > 0 ? `You executed ${args}.` : null;
        message.sender.sendMessage(`Hello, ${playerName}! ${check ? check : ""}`);
    },
};

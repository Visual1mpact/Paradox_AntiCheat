import { Player, ChatSendBeforeEvent } from "@minecraft/server";
import CryptoES from "../node_modules/crypto-es/lib/index";
import { MinecraftEnvironment } from "./container/Dependencies";

// Define the structure for encrypted command data
interface EncryptedCommandData {
    iv: string; // Initialization vector used for encryption
    encryptedData: string; // Encrypted command data
}

// Define the structure for a command
export interface Command {
    name: string; // Name of the command
    description: string; // Description of the command
    usage: string; // Usage instructions for the command
    examples: string[]; // Examples of how to use the command
    execute: (message: ChatSendBeforeEvent, args?: string[], minecraftEnvironment?: MinecraftEnvironment) => void; // Function to execute the command
}

export class CommandHandler {
    private commands: Map<string, EncryptedCommandData>; // Store encrypted command data
    private minecraftEnvironment: MinecraftEnvironment; // Add minecraftEnvironment property

    constructor(
        private securityKey: string,
        minecraftEnvironment: MinecraftEnvironment
    ) {
        this.commands = new Map(); // Initialize the commands map
        this.minecraftEnvironment = minecraftEnvironment; // Initialize minecraftEnvironment
    }

    // Method to register a new command
    registerCommand(commands: Command[]) {
        commands.forEach((command) => {
            // Serialize the execute function to a string
            const serializedExecute = command.execute.toString();

            // Encrypt command data before storing
            const encryptedData = this.encrypt(JSON.stringify({ ...command, execute: serializedExecute }), command.name);

            // Generate iv for this command and use it as the key
            this.commands.set(encryptedData.iv, encryptedData);
        });
    }

    // Method to handle incoming commands
    handleCommand(message: ChatSendBeforeEvent, player: Player) {
        if (!message.message.startsWith("!")) {
            message.cancel = false;
            return;
        } // Ignore messages that don't start with "!"

        const args = message.message.slice(1).trim().split(/ +/); // Split the message into command and arguments
        const commandName = args.shift()?.toLowerCase(); // Extract the command name from the arguments

        if (!commandName) return; // If commandName is empty, return

        // Handle "help" command separately
        if (commandName === "help" || args[0]?.toLowerCase() === "help") {
            if (args.length === 0) {
                // Display all commands if only "help" is used
                this.displayAllCommands(player);
                return;
            }

            // Get command info if specified
            const specifiedCommandName = commandName === "help" ? args[0] : commandName;
            const commandInfo = this.getCommandInfo(specifiedCommandName);
            player.sendMessage(commandInfo || "\n§o§7Command not found.");
            return;
        }

        // Get the encrypted command data from the commands map using iv
        const iv = this.generateIV(commandName);
        const encryptedCommand = this.commands.get(iv.toString(CryptoES.enc.Base64));
        if (encryptedCommand) {
            try {
                // Decrypt the command data
                const decryptedCommandString = this.decrypt(encryptedCommand);
                const decryptedCommand = JSON.parse(decryptedCommandString);

                // Reconstruct the execute function from the serialized string
                const executeFunction = new Function(`return ${decryptedCommand.execute}`)();
                const command: Command = { ...decryptedCommand, execute: executeFunction };

                // Execute the command
                command.execute(message, args, this.minecraftEnvironment);
            } catch (error) {
                console.error("CommandHandler.ts: " + error);
                player.sendMessage("\n§o§7There was an error executing that command!");
            }
        } else {
            player.sendMessage(`\n§o§7Command "${commandName}" not found. Use !help to see available commands.`);
        }
    }

    // Method to display all available commands
    private displayAllCommands(player: Player) {
        let helpMessage = "\n§4[§6Available Commands§4]§r\n\n";
        this.commands.forEach((command) => {
            const decryptedCommand = this.decrypt(command);
            const { name, description } = JSON.parse(decryptedCommand);
            helpMessage += `§6${name}§7: §o§f${description}§r\n`;
        });
        player.sendMessage(helpMessage);
    }

    // Method to get information about a specific command
    private getCommandInfo(commandName: string): string[] {
        const iv = this.generateIV(commandName);
        const encryptedCommand = this.commands.get(iv.toString(CryptoES.enc.Base64));
        if (encryptedCommand) {
            const decryptedCommand = this.decrypt(encryptedCommand);
            const { name, description, usage, examples } = JSON.parse(decryptedCommand);
            return [`\n§4[§6Command§4]§f: §o${name}§r\n`, `§4[§6Usage§4]§f: §o${usage}§r\n`, `§4[§6Description§4]§f: §o${description}§r\n`, `§4[§6Examples§4]§f:\n${examples.map((example: string) => `    §o${example}`).join("\n")}`];
        } else {
            return [`\n§o§7Command "${commandName}" not found.`];
        }
    }

    // Method to encrypt data using AES encryption
    private encrypt(data: string, commandName: string): EncryptedCommandData {
        const iv = this.generateIV(commandName); // Generate a consistent IV based on the command name
        const encryptedData = CryptoES.AES.encrypt(data, this.securityKey, { iv }).toString();
        return { iv: iv.toString(CryptoES.enc.Base64), encryptedData };
    }

    // Method to decrypt data using AES decryption
    private decrypt(encryptedData: EncryptedCommandData): string {
        const iv = CryptoES.enc.Base64.parse(encryptedData.iv);
        const decryptedData = CryptoES.AES.decrypt(encryptedData.encryptedData, this.securityKey, { iv });
        return decryptedData.toString(CryptoES.enc.Utf8);
    }

    // Method to generate a consistent IV based on the security key and command name
    private generateIV(commandName: string): CryptoES.lib.WordArray {
        // Combine the security key and command name to generate a unique identifier
        const uniqueIdentifier = this.securityKey + commandName;
        // Use a cryptographic hash function to derive IV from the unique identifier
        const iv = CryptoES.SHA256(uniqueIdentifier);
        // Take the first 16 bytes of the hash as the IV (AES IV is typically 16 bytes)
        const truncatedIV = iv.words.slice(0, 4); // Each word is 32 bits, so 4 words = 16 bytes
        return CryptoES.lib.WordArray.create(truncatedIV); // Return truncated IV as WordArray
    }
}

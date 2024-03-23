import { Player, ChatSendAfterEvent } from "@minecraft/server";
import CryptoES from "../node_modules/crypto-es/lib/index";

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
    execute: (message: ChatSendAfterEvent, args?: string[]) => void; // Function to execute the command
}

export class CommandHandler {
    private commands: Map<string, EncryptedCommandData>; // Store encrypted command data

    constructor(private securityKey: string) {
        this.commands = new Map(); // Initialize the commands map
    }

    // Method to register a new command
    registerCommand(commands: Command[]) {
        commands.forEach((command) => {
            // Serialize the execute function to a string
            const serializedExecute = command.execute.toString();

            // Encrypt command data before storing
            const encryptedData = this.encrypt(JSON.stringify({ ...command, execute: serializedExecute }));

            // Generate iv for this command and use it as the key
            const iv = this.generateIV();
            this.commands.set(iv.toString(CryptoES.enc.Base64), encryptedData);
        });
    }

    // Method to handle incoming commands
    handleCommand(message: ChatSendAfterEvent, player: Player) {
        if (!message.message.startsWith("!")) return; // Ignore messages that don't start with "!"

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
            player.sendMessage(commandInfo || "\nCommand not found.");
            return;
        }

        // Get the encrypted command data from the commands map using iv
        const iv = this.generateIV();
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
                command.execute(message, args);
            } catch (error) {
                console.error("CommandHandler.ts: " + error);
                player.sendMessage("\nThere was an error executing that command!");
            }
        } else {
            player.sendMessage(`\nCommand "${commandName}" not found. Use !help to see available commands.`);
        }
    }

    // Method to display all available commands
    private displayAllCommands(player: Player) {
        let helpMessage = "\nAvailable commands:\n\n";
        this.commands.forEach((command) => {
            const decryptedCommand = this.decrypt(command);
            const { name, description } = JSON.parse(decryptedCommand);
            helpMessage += `§l${name}§r: ${description}\n`;
        });
        player.sendMessage(helpMessage);
    }

    // Method to get information about a specific command
    private getCommandInfo(commandName: string): string {
        const iv = this.generateIV();
        const encryptedCommand = this.commands.get(iv.toString(CryptoES.enc.Base64));
        if (encryptedCommand) {
            const decryptedCommand = this.decrypt(encryptedCommand);
            const { name, description, usage } = JSON.parse(decryptedCommand);
            return `\n§l${name}§r: ${description}\n  - ${usage}`;
        } else {
            return `\nCommand "${commandName}" not found.`;
        }
    }

    // Method to encrypt data using AES encryption
    private encrypt(data: string): EncryptedCommandData {
        const iv = this.generateIV(); // Generate a consistent IV
        const encryptedData = CryptoES.AES.encrypt(data, this.securityKey, { iv }).toString();
        return { iv: iv.toString(CryptoES.enc.Base64), encryptedData };
    }

    // Method to decrypt data using AES decryption
    private decrypt(encryptedData: EncryptedCommandData): string {
        const iv = CryptoES.enc.Base64.parse(encryptedData.iv);
        const decryptedData = CryptoES.AES.decrypt(encryptedData.encryptedData, this.securityKey, { iv });
        return decryptedData.toString(CryptoES.enc.Utf8);
    }

    // Method to generate a consistent IV based on the security key
    private generateIV(): CryptoES.lib.WordArray {
        // Use a cryptographic hash function to derive IV from the security key
        const keyHash = CryptoES.SHA256(this.securityKey);
        // Take the first 16 bytes of the hash as the IV (AES IV is typically 16 bytes)
        return keyHash.clone(); // Ensure the return type is WordArray
    }
}

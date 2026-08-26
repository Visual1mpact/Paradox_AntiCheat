import { ChatSendBeforeEvent, world } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";

/**
 * Cached reference to transferPlayer if server-admin is available.
 */
let transferPlayerFunc: typeof import("@minecraft/server-admin").transferPlayer | undefined;

/**
 * Attempts to dynamically load the server-admin module.
 *
 * This allows the command to gracefully disable itself on Realms,
 * where the @minecraft/server-admin module is not available.
 *
 * @returns {Promise<boolean>}
 * True if transferPlayer is available, false otherwise.
 */
async function ensureTransferSupport(): Promise<boolean> {
    if (transferPlayerFunc) return true;

    try {
        const adminModule = await import("@minecraft/server-admin");
        transferPlayerFunc = adminModule.transferPlayer;
        return true;
    } catch {
        return false;
    }
}

/**
 * Represents the transfer command.
 *
 * Allows players to connect to another Minecraft Bedrock server
 * by specifying a hostname (IP or domain) and port.
 *
 * Automatically disables itself on platforms that do not support
 * server transfer (such as Realms).
 *
 * Security Clearance: 1
 */
export const transferCommand: Command = {
    name: "transfer",
    description: "Transfers you to another server using hostname and port.",
    usage: "{prefix}transfer -h <hostname> -p <port>",
    examples: ["{prefix}transfer -h play.example.com -p 19132", "{prefix}transfer -h 25.777.25.777 -p 25806"],
    icon: "textures/items/ender_pearl.png",
    securityClearance: 1,
    guiInstructions: {
        formType: "ActionFormData",
        title: "Server Transfer",
        description: "Enter the destination server information.\n\n" + "§7• Hostname can be IP or domain\n" + "§7• Port must be a number\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Transfer",
                securityClearance: 1,
                icon: "textures/ui/NetherPortal.png",
                requiredFields: ["Hostname", "Port"],
                generateModalForm: true,
            },
        ],
        dynamicFields: [
            {
                type: "text",
                name: "\nEnter Hostname:",
                placeholder: "play.example.com",
                arg: "--hostname",
                requiredFields: ["Hostname"],
            },
            {
                type: "text",
                name: "\nEnter Port:",
                placeholder: "19132",
                arg: "--port",
                requiredFields: ["Port"],
            },
        ],
    },
    category: "Utility",

    /**
     * Executes the transfer command.
     *
     * Performs a runtime compatibility check to ensure
     * server transfer is supported before attempting to transfer.
     *
     * @param {ChatSendBeforeEvent | undefined} message
     * @param {string[] | undefined} args
     */
    execute: async (message: ChatSendBeforeEvent | undefined, args: string[] | undefined): Promise<void> => {
        if (!message || !args) return;

        const sender = message.sender;
        const prefix = world.getDynamicProperty("__prefix") ?? ":";

        /**
         * Verify server-admin module availability.
         * Prevents errors when running on Realms.
         */
        const supported = await ensureTransferSupport();

        if (!supported || !transferPlayerFunc) {
            sender.sendMessage("§o§c[Paradox] Server transfer is not supported on this platform.");

            return;
        }

        let hostname = "";
        let port: number | undefined;

        const validFlags = new Set(["-h", "--hostname", "-p", "--port"]);

        /**
         * Captures multi-word arguments until another valid flag is reached.
         *
         * @param {string[]} args
         * @returns {string}
         */
        function captureMultiWordArgument(args: string[]): string {
            let result = "";

            while (args.length > 0 && !validFlags.has(args[0]!)) {
                result += (result ? " " : "") + args.shift();
            }

            return result.replace(/["@]/g, "");
        }

        /**
         * Parse arguments.
         */
        while (args.length > 0) {
            const flag = args.shift();

            switch (flag) {
                case "-h":
                case "--hostname":
                    hostname = captureMultiWordArgument(args);
                    break;

                case "-p":
                case "--port":
                    port = Number(captureMultiWordArgument(args));
                    break;
            }
        }

        /**
         * Validate hostname and port.
         */
        if (!hostname || !port || isNaN(port)) {
            sender.sendMessage(`§2[§7Paradox§2]§o§7 Usage: ${prefix}§7transfer -h <hostname> -p <port>`);

            return;
        }

        /**
         * Persist last used server for convenience.
         */
        sender.setDynamicProperty("lastTransferHost", hostname);
        sender.setDynamicProperty("lastTransferPort", port);

        sender.sendMessage(`§2[§7Paradox§2]§o§7 Connecting to ${hostname}:${port}...`);

        /**
         * Execute transfer.
         */
        try {
            transferPlayerFunc(sender, {
                hostname,
                port,
            });
        } catch {
            sender.sendMessage("§o§c[Paradox] Transfer failed. Verify the server address and port.");
        }
    },
};

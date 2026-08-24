import { ChatSendBeforeEvent, Player } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";
import { MessageFormData } from "@minecraft/server-ui";
import { openMainGui } from "../gui/form-generator";

/**
 * Displays a chronological history dossier of the Paradox AntiCheat project.
 * Content is curated from internal development logs and major project milestones.
 *
 * Clearance: Level 1 (Accessible to all players)
 */
export const historyCommand: Command = {
    name: "history",
    description: "Displays the historical journey and rise of Paradox AntiCheat over the years.",
    usage: "{prefix}history",
    examples: ["{prefix}history"],
    icon: "textures/ui/book_edit_default.png",
    category: "Utility",
    securityClearance: 1,
    guiInstructions: {
        formType: "ActionFormData",
        title: "The Paradox Legacy",
        description:
            "Explore the complete history of Paradox AntiCheat from its early experimental detection systems to a modern Minecraft security framework.\n\n" +
            "§7• Discover the 2022 foundation and Scythe origins.\n" +
            "§7• Follow the Script API and TypeScript evolution.\n" +
            "§7• Learn about forensic systems, databases, and performance breakthroughs.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Read History Dossier",
                icon: "textures/ui/how_to_play_button_default.png",
                description: "Open a detailed chronological timeline of project history.",
            },
        ],
    },

    /**
     * Executes the history command.
     * @param {ChatSendBeforeEvent | undefined} message - The chat event.
     */
    execute: (message?: ChatSendBeforeEvent) => {
        if (!message) return;
        const sender = message.sender;

        const showHistoryForm = (sender: Player) => {
            const historyBody =
                "§2============================\n" +
                "§7The Rise of Paradox AntiCheat\n" +
                "§2============================\n\n" +
                "§6The Origins — The Foundation Era (2022)§r\n" +
                "Paradox AntiCheat began as an ambitious Bedrock protection project built from experimental behavior-pack technology. Early development focused on understanding the limits of Minecraft scripting and creating reliable methods to detect unfair gameplay.\n\n" +
                "The first generation introduced systems for illegal item detection, abnormal block placement, movement analysis, combat monitoring, Anti-Nuker, Anti-Scaffold, and early exploit prevention. These experiments established Paradox's core philosophy: using logic, mathematics, and server-side observation instead of simple rule checks.\n\n" +
                "Performance quickly became a priority. Early scheduling systems and optimization techniques were introduced to reduce unnecessary execution and protect server stability while maintaining accurate detections.\n\n" +
                "§6The Expansion Years — The Script API Era (2023)§r\n" +
                "As Minecraft Bedrock scripting matured, Paradox transformed from a collection of detections into a complete framework. The project moved toward TypeScript-based development, modular architecture, and improved maintainability.\n\n" +
                "This era introduced advanced administrative systems, expanded commands, player utilities, teleport tools, inventory management, and interactive interfaces. Security also became a major focus with encrypted storage systems and stronger player data handling.\n\n" +
                "The foundations of modern Paradox were created during this period: organized modules, reusable utilities, persistent data systems, and a stronger separation between detection logic and server management.\n\n" +
                "§6The Rewrite Era — Intelligence and Forensics (2024-2025)§r\n" +
                "The greatest transformation in Paradox history came through a complete architectural refinement. The project moved beyond traditional anti-cheat functionality and began developing into a full server intelligence platform.\n\n" +
                "Advanced forensic systems were introduced, including player identity tracking, spoof detection, inventory synchronization, chest auditing, combat analysis, and detailed investigation tools. Administrative workflows were rebuilt with improved GUIs and the introduction of a structured security clearance system.\n\n" +
                "The Data Hive era revolutionized storage. Optimized databases, encrypted information handling, caching systems, chunked data storage, and safer asynchronous operations allowed Paradox to manage larger amounts of historical player information while maintaining performance.\n\n" +
                "§6The Modern Era — Performance Engineering (2026+)§r\n" +
                "In 2026, Paradox entered its highest-performance generation. Development shifted toward event-driven architecture, background processing, and memory-efficient systems designed for large-scale servers.\n\n" +
                "The EventCoordinator unified native event handling, reducing unnecessary script bridge operations. Detection modules transitioned toward generator-based background jobs using system.runJob(), improving stability and allowing intensive analysis to run efficiently.\n\n" +
                "Modern breakthroughs include advanced Aimbot rotation analysis, Anti-Crash packet protection, AutoTotem detection, Critical Hit analysis, Pathing detection, packet rate limiting, chat spam tracking, and improved historical data buffers.\n\n" +
                "Player services also reached a new level with GPS waypoint navigation, detailed metadata records, investigation dossiers, optimized player caching, and database-backed utilities.\n\n" +
                "§6The Paradox Legacy — Beyond Anti-Cheat§r\n" +
                "What began as experimental exploit detection became a complete Minecraft security ecosystem. Paradox evolved from simple protections into a framework combining prevention, investigation, administration, optimization, and player management.\n\n" +
                "Every generation built upon the last — from early behavior-pack experiments, to Script API innovation, to modern event-driven engineering. The history of Paradox is the story of constant improvement, adaptation, and the pursuit of a smarter Minecraft experience.\n\n" +
                "§7Records curated from the Paradox Audit Log.§r\n" +
                "§2============================";

            const form = new MessageFormData().title("              Paradox History").body(historyBody).button1("Close").button2("Back");

            form.show(sender)
                .then((response) => {
                    if (response.canceled) {
                        if (response.cancelationReason === "UserBusy") {
                            showHistoryForm(sender);
                        }
                        return;
                    }

                    if (response.selection === 1) {
                        openMainGui(sender);
                    }
                })
                .catch((err) => console.error(`[Paradox] History GUI Error: ${err}`));
        };

        sender.sendMessage("§2[§7Paradox§2]§o§7 History dossier requested. Please close your chat window to view.");

        showHistoryForm(sender);
    },
};

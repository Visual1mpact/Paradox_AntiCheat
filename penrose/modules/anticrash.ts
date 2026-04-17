import { world, system } from "@minecraft/server";
import { banlistDB } from "../event-listeners/world-initialize";
import { getSecurityClearanceLevel4Players } from "../utility/level-4-security-tracker";
import { PacketReceivedBeforeEvent } from "@minecraft/server-net";

/**
 * Maximum allowed size for a sub-chunk request packet (in bytes).
 * A crasher packet with millions of offsets will be several megabytes.
 * Vanilla packets are typically well under 1KB.
 */
const MAX_PACKET_SIZE_THRESHOLD = 16384;

let isAntiCrashEnabled = false;
let packetHandlerRef: ((data: PacketReceivedBeforeEvent) => void) | null = null;
let serverNet: typeof import("@minecraft/server-net").beforeEvents;
let PacketId: typeof import("@minecraft/server-net").PacketId;

/**
 * Handles incoming packets to detect SubChunkRequest exploits.
 */
function handlePacket(data: PacketReceivedBeforeEvent) {
    if (data.packetId !== PacketId.SubChunkRequestPacket) return;

    const player = data.sender;
    if (!player || !player.isValid) return;

    // Validate the raw packet size to block oversized coordinate flood exploits
    if (data.packetSize > MAX_PACKET_SIZE_THRESHOLD) {
        data.cancel = true;

        const playerName = player.name;
        const sizeKB = (data.packetSize / 1024).toFixed(2);

        // Immediate enforcement
        system.run(async () => {
            const now = Date.now();
            const bannedPlayers = banlistDB.get("players") ?? {};

            if (!(playerName in bannedPlayers)) {
                bannedPlayers[playerName] = {
                    reason: `Crasher Exploit (Oversized SubChunk Packet: ${sizeKB}KB)`,
                    bannedBy: "Paradox Anti-Crash",
                    timestamp: now,
                };
                await banlistDB.set("players", bannedPlayers);
            }

            const staff = getSecurityClearanceLevel4Players();
            for (const s of staff) {
                s.sendMessage(`§2[§7Paradox§2]§o§7 §e[Anti-Crash]§7 Blocked crash attempt from §f${playerName} §e[${sizeKB}KB]§7.`);
            }

            world.getDimension("overworld").runCommand(`kick @s [Paradox] Crasher exploit detected.`);
        });
    }
}

/**
 * Initializes the packet handler logic by dynamically importing server-net.
 */
async function initializeAntiCrash(): Promise<boolean | void> {
    try {
        const networkModule = await import("@minecraft/server-net");
        serverNet = networkModule.beforeEvents;
        PacketId = networkModule.PacketId;
    } catch {
        return false;
    }
}

/**
 * Starts the Anti-Crash module.
 */
export async function startAntiCrash(): Promise<boolean> {
    if (isAntiCrashEnabled) return true;

    const success = await initializeAntiCrash();
    if (success === false) return false;

    isAntiCrashEnabled = true;
    packetHandlerRef = (data) => handlePacket(data);

    serverNet.packetReceive.subscribe(packetHandlerRef, {
        monitoredPacketIds: [PacketId.SubChunkRequestPacket],
    });

    return true;
}

/**
 * Stops the Anti-Crash module.
 */
export function stopAntiCrash() {
    if (!isAntiCrashEnabled) return;

    isAntiCrashEnabled = false;
    if (packetHandlerRef && serverNet) {
        serverNet.packetReceive.unsubscribe(packetHandlerRef);
        packetHandlerRef = null;
    }
}

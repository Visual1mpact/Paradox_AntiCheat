import { CommandResult, Dimension, Entity, Player, world } from "@minecraft/server";
import { getStack } from "./misc.js";

const overworld = world.getDimension("overworld");

//// COMMAND WRAPPER ////

/**
 * Executes Minecraft command.
 * @param command Minecraft command.
 * @param source Target where the command will be executed on.
 * @param ignoreError Detemines whether command error should be ignored or not.
 * @returns Command response.
 */
export function execCmd(command: string, source: Dimension | Entity | Player = overworld, ignoreError = false): commandResponse {
    try {
        return source.runCommandAsync(command);
    } catch (e) {
        if (typeof e != "string") throw e;
        const data: commandResponse = JSON.parse(e);
        if (ignoreError) return data;
        else throw new CommandError(command, data.statusCode, data.statusMessage);
    }
}

export class CommandError extends Error {
    constructor(input: string, code: number, message: string) {
        super(message);
        this.name = "CommandError";
        this.stack = getStack(2);
        this.code = code;
        this.input = input;
    }
    /** Response code. `0` if succeed, `-2147483648` if syntax error, `-2147352576` if command error. */
    code: number;
    /** Command input. */
    input: string;
}

interface commandResponse {
    [k: string]: any;
    /** Response code. `0` if succeed, `-2147483648` if syntax error, `-2147352576` if command error. */
    statusCode?: number;
    /** Response message. */
    statusMessage?: string;
}

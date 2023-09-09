import { Player, world } from "@minecraft/server";

/**
 * A utility class for managing player scores.
 */
export class ScoreManager {
    /**
     * Returns the score of a player in the specified scoreboard objective.
     * @param {string} objective - Scoreboard objective.
     * @param {Player} player - The player object.
     * @returns {number} The player's score or 0 if not found.
     */
    public static getScore(objective: string, player: Player): number {
        try {
            return world.scoreboard.getObjective(objective).getScore(player.scoreboardIdentity);
        } catch (error) {
            return 0;
        }
    }

    /**
     * Sets a player's score.
     * @param {Player} target - The player object.
     * @param {string} objective - Scoreboard objective.
     * @param {number} amount - The number to set it to.
     * @param {boolean} stack - If true, it will be added instead of set. Default false.
     * @returns {number} The score it was set to.
     */
    public static setScore(target: Player, objective: string, amount: number, stack: boolean = false): number {
        const scoreObj = world.scoreboard.getObjective(objective);
        if (scoreObj) {
            const isParticipant = !!scoreObj.getParticipants().some((participant) => participant.id === target.scoreboardIdentity.id);
            if (!isParticipant) {
                target.runCommand(`scoreboard players add @s ${objective} 0`);
            }
            const score = isParticipant ? scoreObj.getScore(target.scoreboardIdentity) : 0;
            const result = stack ? score + amount : amount;
            scoreObj.setScore(target.scoreboardIdentity, result);
            return result;
        } else {
            return 0;
        }
    }

    /**
     * An array of all score objectives.
     * @name allscores
     * @type {string[]}
     */
    public static allscores: string[] = [
        "autoclickervl",
        "badpacketsvl",
        "killauravl",
        "flyvl",
        "illegalitemsvl",
        "cbevl",
        "gamemodevl",
        "spammervl",
        "namespoofvl",
        "speedvl",
        "crashervl",
        "reachvl",
        "invalidsprintvl",
        "armorvl",
        "antikbvl",
        "antifallvl",
        "nukervl",
        "scaffoldvl",
        "antiphasevl",
    ];
}

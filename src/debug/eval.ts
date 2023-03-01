import config from "../data/config.js";
import { crypto, sendMsg, sendMsgToPlayer } from "../util.js";
import viewobj from "./viewobj.js";

/**
 * **CAUTION: EVAL IS DANGEROUS!**
 *
 * IT can be used to execute JavaScript code in-game, which can be useful for debugging,
 * but also can be dangerous since it can destroy your world.
 *
 * **ENABLE AT YOUR OWN RISK!**
 */
const enableEval = false;

export function evalCmd(evd: mc.BeforeChatEvent, args: string[], argFull?: string[]) {
    const { sender: player } = evd;
    evd.cancel = true;

    // check for toggle
    if (!(config.debug && enableEval)) return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Eval is disabled.`);

    // Check for hash/salt and validate password
    let hash = player.getDynamicProperty("hash");
    let salt = player.getDynamicProperty("salt");
    let encode;
    try {
        encode = crypto(salt, config.modules.encryption.password);
    } catch (error) {}

    // make sure the user has permissions to run the command
    if (hash === undefined || encode !== hash) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to use this command.`);
    }

    // tells staff
    player.addTag("evalSelf");
    sendMsg("@a[tag=paradoxOpped, tag=!evalSelf]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r is using §6Eval§r: ${argFull}`);
    player.removeTag("evalSelf");

    // execute the eval
    let v;
    try {
        sendMsgToPlayer(player, `> ${argFull}`);
        v = Function(`context`, `with (context) return eval(${JSON.stringify(argFull)})`)(objSelfProperty);
    } catch (e) {
        return sendMsgToPlayer(player, "Uncaught " + (e instanceof Error ? `${e}\n${e.stack}` : viewobj(e)));
    }
    return sendMsgToPlayer(player, viewobj(v));
}

import { enchantmentSlot as enchantments } from "../data/enchantments.js";
import { GlobalBanList as globalBan } from "../penrose/playerspawnevent/ban/globalbanlist.js";
import { illegalitems as illegalItems } from "../data/itemban.js";
import { onJoinData } from "../data/onjoindata.js";
import salvageable from "../data/salvageable.js";
import { whitelist as whitelistItems } from "../data/whitelistitems.js";
import { xrayblocks as xrayBlocks } from "../data/xray.js";
import * as scheduling from "../libs/scheduling.js";
import scoreboard from "../libs/scoreboardnew.js";
import * as util from "../util.js";
import { world } from "@minecraft/server";
import * as mc from "@minecraft/server";
import * as gt from "@minecraft/server-gametest";

const objSelfProperty = new Proxy(
    Object.setPrototypeOf(
        {
            config: Object.setPrototypeOf(
                {
                    config,
                    enchantments,
                    globalBan,
                    illegalitems: illegalItems,
                    onJoinData,
                    salvageable,
                    whitelistItems,
                    xrayblocks: xrayBlocks,
                },
                null
            ),
            scheduling,
            scoreboard,
            util,
            viewobj,

            world,
            mc,
            gt,

            get self() {
                return objSelfProperty;
            },
            [Symbol.unscopables]: {},
            [Symbol.toStringTag]: "Self",
        },
        null
    ),
    {
        get: (t, p) => {
            if (p in t) return t[p];
            if (p in globalThis) return globalThis[p];
            throw new ReferenceError(`'${String(p)}' is not defined`);
        },
        has: () => true,
        ownKeys: () => [],
    }
);

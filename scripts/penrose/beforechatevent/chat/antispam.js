import { world } from "mojang-minecraft";
import { disabler } from "../../../util.js";
import config from "../../../data/config.js";

const World = world;

const spamCheck = new Map();

// Custom object and property
const _player = {
    count: 0,
    spam: 0,
    check: 0
};

function timer() {
    _player.count = 0;
}

function antispam(msg) {
    // Unsubscribe if disabled in-game
    if (config.modules.antispam.enabled === false) {
        World.events.beforeChat.unsubscribe(antispam);
        return;
    }
    // Store player object
    let player = msg.sender;
    let message = msg.message;

    let tag = player.hasTag('paradoxOpped');

    if (!tag) {
        // Increment
        _player.count++;

        // Specific to Horion
        if (message.includes("the best minecraft bedrock utility mod")) {
            _player.check++;
        }

        if (!spamCheck.get(disabler(player.nameTag))) {
            spamCheck.set(disabler(player.nameTag), message);
        } else {
            let oldChat = spamCheck.get(disabler(player.nameTag));
            if (oldChat === message && _player.count >= 2) {
                _player.spam++;
                try {
                    player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Do not spam chat!"}]}`);
                } catch (error) {}
                msg.cancel = true;
            } else if (_player.check >= 2) {
                msg.cancel = true;
                _player.spam = 10;
                _player.check = 0;
            } else {
                _player.spam = 0;
            }
            if (_player.spam >= 10) {
                let tags = player.getTags();
                // This removes old ban tags
                tags.forEach(t => {
                    if(t.startsWith("Reason:")) {
                        player.removeTag(t);
                    }
                    if(t.startsWith("By:")) {
                        player.removeTag(t);
                    }
                });
                try {
                    player.runCommand(`tag "${disabler(player.nameTag)}" add "Reason:Spamming"`);
                    player.runCommand(`tag "${disabler(player.nameTag)}" add "By:Paradox"`);
                    player.addTag('isBanned');
                } catch (error) {
                    player.triggerEvent('paradox:kick');
                }
            }
            spamCheck.set(disabler(player.nameTag), message);
        }

        if (_player.count >= 2) {
            msg.cancel = true;
            try {
                player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You are sending too many messages! Please slow down!"}]}`);
            } catch (error) {}
            return;
        }
    }
}

const AntiSpam = () => {
    World.events.beforeChat.subscribe(msg => antispam(msg));
};

export { AntiSpam, timer };
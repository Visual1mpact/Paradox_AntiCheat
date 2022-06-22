import { world } from "mojang-minecraft";
import { crypto, sendMsgToPlayer } from "../../../util.js";
import config from "../../../data/config.js";

const World = world;

const spamCheck = new WeakMap();

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
    // Get Dynamic Property
    let antiSpamBoolean = World.getDynamicProperty('antispam_b');
    if (antiSpamBoolean === undefined) {
        antiSpamBoolean = config.modules.antispam.enabled;
    }
    // Unsubscribe if disabled in-game
    if (antiSpamBoolean === false) {
        World.events.beforeChat.unsubscribe(antispam);
        return;
    }
    // Store player object
    let player = msg.sender;
    let message = msg.message;

    // Check for hash/salt and validate password
    let hash = player.getDynamicProperty('hash');
    let salt = player.getDynamicProperty('salt');
    let encode;
    try {
        encode = crypto(salt, config.modules.encryption.password);
    } catch (error) {}

    if (hash === undefined || encode !== hash) {
        // Increment
        _player.count++;

        // Specific to Horion
        if (message.includes("the best minecraft bedrock utility mod")) {
            _player.check++;
        }

        if (!spamCheck.get(player)) {
            spamCheck.set(player, message);
        } else {
            let oldChat = spamCheck.get(player);
            if (oldChat === message && _player.count >= 2) {
                _player.spam++;
                try {
                    sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Do not spam the chat!`)
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
                    player.addTag('Reason:Spamming');
                    player.addTag('By:Paradox');
                    player.addTag('isBanned');
                } catch (error) {
                    player.triggerEvent('paradox:kick');
                }
            }
            spamCheck.set(player, message);
        }

        if (_player.count >= 2) {
            msg.cancel = true;
            try {
                sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You are sending too many messages in a short time!`)
            } catch (error) {}
            return;
        }
    }
}

const AntiSpam = () => {
    World.events.beforeChat.subscribe(antispam);
};

export { AntiSpam, timer };
import { commandHandler } from "../../commands/index";
import { world, ChatSendBeforeEvent } from "@minecraft/server";

class ChatSendSubscription {
    private subscription: any;

    constructor() {
        this.subscription = world.beforeEvents.chatSend.subscribe((object: ChatSendBeforeEvent) => {
            const player = object.sender;
            object.cancel = true;
            commandHandler.handleCommand(object, player);
        });
    }

    subscribe() {
        // You can check if the subscription is already active before subscribing again
        if (!this.subscription) {
            this.subscription = world.beforeEvents.chatSend.subscribe((object: ChatSendBeforeEvent) => {
                const player = object.sender;
                object.cancel = true;
                commandHandler.handleCommand(object, player);
            });
        }
    }

    unsubscribe() {
        if (this.subscription) {
            this.subscription.unsubscribe();
            this.subscription = undefined;
        }
    }
}

export const chatSendSubscription = new ChatSendSubscription();

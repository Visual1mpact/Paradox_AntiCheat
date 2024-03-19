import { commandHandler } from "../../commands/index";
import { world, ChatSendAfterEvent } from "@minecraft/server";

class ChatSendSubscription {
    private subscription: any;

    constructor() {
        this.subscription = world.afterEvents.chatSend.subscribe((object: ChatSendAfterEvent) => {
            const player = object.sender;
            commandHandler.handleCommand(object, player);
        });
    }

    subscribe() {
        // You can check if the subscription is already active before subscribing again
        if (!this.subscription) {
            this.subscription = world.afterEvents.chatSend.subscribe((object: ChatSendAfterEvent) => {
                const player = object.sender;
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

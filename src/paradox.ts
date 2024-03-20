import { chatSendSubscription } from "./classes/subscriptions/ChatSendSubscriptions";
import { clearSecretKey } from "./security/generateRandomKey";

chatSendSubscription.subscribe();

clearSecretKey();

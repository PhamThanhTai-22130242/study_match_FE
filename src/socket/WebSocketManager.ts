import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { SOCKET_URL } from '../config/BaseConfig';

class WebSocketManager {
    private static instance: WebSocketManager;
    private client: Client | null = null;
    private connected = false;
    private connectingPromise: Promise<void> | null = null;
    private subscriptions: Map<string, StompSubscription> = new Map();
    private messageHandlers: Map<string, Set<(msg: string) => void>> = new Map();
    private connectListeners: Set<() => void> = new Set();

    private constructor() { }

    public static getInstance(): WebSocketManager {
        if (!WebSocketManager.instance) {
            WebSocketManager.instance = new WebSocketManager();
        }
        return WebSocketManager.instance;
    }


    public connect(): Promise<void> {
        if (this.connected && this.client?.connected) {
            return Promise.resolve();
        }

        if (this.connectingPromise) {
            return this.connectingPromise;
        }

        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken || accessToken.split('.').length !== 3) {
            return Promise.reject(new Error('Access token không hợp lệ'));
        }

        this.connectingPromise = new Promise((resolve, reject) => {
            this.client = new Client({
                brokerURL: SOCKET_URL,
                connectHeaders: {
                    Authorization: `Bearer ${accessToken}`
                },
                reconnectDelay: 5000,
                debug: (str: any) => console.log('[STOMP]', str),

                onConnect: () => {
                    this.connected = true;
                    this.connectingPromise = null;
                    this.subscriptions.clear();
                    this.messageHandlers.forEach((_, destination) => {
                        this.subscribe(destination);
                    });
                    this.connectListeners.forEach((listener) => {
                        try {
                            listener();
                        } catch (error) {
                            console.error('onConnect listener failed:', error);
                        }
                    });
                    console.log('STOMP connected');
                    resolve();
                },

                onDisconnect: () => {
                    this.connected = false;
                    this.connectingPromise = null;
                    this.subscriptions.clear();
                    console.log('STOMP disconnected');
                },

                onStompError: (frame: any) => {
                    console.error('STOMP error:', frame);
                    this.connected = false;
                    this.connectingPromise = null;
                    reject(new Error(frame?.headers?.message || 'STOMP error'));
                },

                onWebSocketError: (error: any) => {
                    console.error('WebSocket error:', error);
                    this.connected = false;
                    this.connectingPromise = null;
                    reject(error);
                },

                onWebSocketClose: () => {
                    this.connected = false;
                    this.connectingPromise = null;
                    this.subscriptions.clear();
                },
            });

            this.client.activate();
        });

        return this.connectingPromise;
    }

    public onMessage(destination: string, cb: (msg: string) => void) {
        const handlers = this.messageHandlers.get(destination) || new Set();
        handlers.add(cb);
        this.messageHandlers.set(destination, handlers);
        this.subscribe(destination);
        return () => {
            const current = this.messageHandlers.get(destination);
            current?.delete(cb);
            if (current && current.size === 0) this.messageHandlers.delete(destination);
        };
    }

    public onConnected(cb: () => void) {
        this.connectListeners.add(cb);
        if (this.connected && this.client?.connected) {
            cb();
        }
        return () => {
            this.connectListeners.delete(cb);
        };
    }

    private subscribe(destination: string) {
        if (!this.client || !this.connected || !this.client.connected) return;
        if (this.subscriptions.has(destination)) return;

        const subscription = this.client.subscribe(destination, (message: IMessage) => {
            this.messageHandlers.get(destination)?.forEach((handler) => handler(message.body));
        });
        this.subscriptions.set(destination, subscription);
    }

    public sendMessage(destination: string, body: any = '') {
        if (!this.client || !this.connected || !this.client.connected) {
            throw new Error('WebSocket chưa kết nối');
        }

        this.client.publish({
            destination,
            body: typeof body === 'string' ? body : JSON.stringify(body),
        });
    }

    public disconnect() {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
        this.subscriptions.clear();
        this.messageHandlers.clear();

        if (this.client) {
            this.client.deactivate();
            this.client = null;
        }

        this.connected = false;
        this.connectingPromise = null;
    }
}

export default WebSocketManager;

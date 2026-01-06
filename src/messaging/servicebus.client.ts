import {
  ServiceBusClient,
  ServiceBusMessage,
  ServiceBusReceiver,
  ServiceBusSender,
} from '@azure/service-bus';
import { MessagingClient } from './messaging.interface';

export class ServiceBusClientAdapter implements MessagingClient {
  private client: ServiceBusClient;
  private senders: Map<string, ServiceBusSender> = new Map();

  constructor() {
    this.client = new ServiceBusClient(
      process.env.SERVICEBUS_CONNECTION_STRING!,
    );
  }
  // async connect(): Promise<void> {
  //   this.client = new ServiceBusClient(
  //     process.env.SERVICEBUS_CONNECTION_STRING,
  //   );
  // }
  /** 🔹 Get or create a sender for a given queue */
  private getSender(queueName: string): ServiceBusSender {
    if (!this.senders.has(queueName)) {
      const sender = this.client.createSender(queueName);
      this.senders.set(queueName, sender);
    }
    return this.senders.get(queueName)!;
  }

  /** 🔹 Emit (fire-and-forget) a single message */
  async emit<T>(pattern: string, data: T, queueName: string): Promise<void> {
    const sender = this.getSender(queueName);

    const message: ServiceBusMessage = {
      body: { pattern, data },
      applicationProperties: { pattern },
    };

    await sender.sendMessages(message);
  }

  /** 🔹 Emit a batch of messages efficiently */
  async emitBatch<T>(
    pattern: string,
    dataArray: T[],
    queueName: string,
  ): Promise<void> {
    const sender = this.getSender(queueName);
    let batch = await sender.createMessageBatch();

    for (const data of dataArray) {
      const message: ServiceBusMessage = {
        body: { pattern, data },
        applicationProperties: { pattern },
      };

      if (!batch.tryAddMessage(message)) {
        await sender.sendMessages(batch);
        batch = await sender.createMessageBatch();
        if (!batch.tryAddMessage(message)) {
          console.error('❌ Message too large to send.');
        }
      }
    }

    if (batch.count > 0) {
      await sender.sendMessages(batch);
    }

    console.log(`✅ Sent ${dataArray.length} messages to queue: ${queueName}`);
  }

  /** 🔹 Send a message expecting a response (optional RPC pattern) */
  async send<T, R>(pattern: string, data: T, queueName: string): Promise<R> {
    const sender = this.getSender(queueName);
    await sender.sendMessages({
      body: { pattern, data },
      applicationProperties: { pattern },
    });
    // Azure SB doesn't support direct reply — must use reply queue if needed.
    return {} as R;
  }

  /** 🔹 Subscribe to a queue and handle messages */
  async subscribe<T>(
    queueName: string,
    handler: (data: T) => Promise<void>,
  ): Promise<void> {
    const receiver: ServiceBusReceiver = this.client.createReceiver(queueName);

    receiver.subscribe({
      processMessage: async (message) => {
        try {
          await handler(message.body as T);
        } catch (err) {
          console.error(`❌ Error processing message from ${queueName}:`, err);
        }
      },
      processError: async (err) => {
        console.error(`⚠️ Receiver error on ${queueName}:`, err);
      },
    });

    console.log(`🎧 Subscribed to queue: ${queueName}`);
  }

  /** 🔹 Gracefully close all resources (optional for app shutdown) */
  async close(): Promise<void> {
    for (const sender of this.senders.values()) {
      await sender.close();
    }
    await this.client.close();
  }
}

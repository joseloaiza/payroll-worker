import { ServiceBusClient } from '@azure/service-bus';
import { MessagingClient } from './messaging.interface';

export class ServiceBusClientAdapter implements MessagingClient {
  private client: ServiceBusClient;

  constructor() {}
  async connect(): Promise<void> {
    this.client = new ServiceBusClient(
      process.env.SERVICEBUS_CONNECTION_STRING,
    );
  }
  // async subscribe(
  //   queue: string,
  //   handler: (msg: any) => Promise<void>,
  // ): Promise<void> {
  //   const receiver = this.client.createReceiver(queue);
  //   receiver.subscribe(
  //     {
  //       processMessage: async (message) => {
  //         try {
  //           await handler(message.body);
  //         } catch (err) {
  //           console.error('ServiceBus handler error', err);
  //         }
  //       },
  //       processError: async (err) => {
  //         console.error('ServiceBus error', err);
  //       },
  //     },
  //     {
  //       autoCompleteMessages: false,
  //       maxConcurrentCalls: 1,
  //       maxAutoLockRenewalDurationInMs: 300000, // 5 minutes
  //     },
  //   );
  // }
  async subscribe(
    queue: string,
    handler: (msg: any) => Promise<void>,
  ): Promise<void> {
    const receiver = this.client.createReceiver(queue);

    receiver.subscribe(
      {
        processMessage: async (message) => {
          const payload = message.body;
          try {
            // 1️⃣ Immediately complete (ack) the message so the lock is gone
            await receiver.completeMessage(message);

            // 2️⃣ Process the job asynchronously (no lock dependency)
            handler(payload).catch((err) => {
              console.error(
                `Background processing failed for job: ${JSON.stringify(payload)}`,
                err,
              );
              // 👉 here you can persist to DB, dead-letter, or trigger retry logic
            });
          } catch (err) {
            console.error('Error during fast-ack or scheduling:', err);
            try {
              await receiver.abandonMessage(message);
            } catch (abandonErr) {
              console.warn(
                'Abandon failed (already completed/expired), ignoring:',
                abandonErr.message,
              );
            }
          }
        },
        processError: async (args) => {
          console.error('ServiceBus error', args.error);
        },
      },
      {
        autoCompleteMessages: false, // we handle ack manually
        maxConcurrentCalls: 1, // safer for debugging, can increase later
      },
    );
  }

  async publish(queue: string, message: any): Promise<void> {
    const sender = this.client.createSender(queue);
    await sender.sendMessages({ body: message });
    await sender.close();
  }
}

import { MessagingClient } from './messaging.interface';
import * as amqp from 'amqplib';

export class RabbitMQClient implements MessagingClient {
  private connection: amqp.Connection;
  private channel: amqp.Channel;

  constructor() {}
  async connect(): Promise<void> {
    this.connection = await amqp.connect(
      process.env.RABBITMQ_URL || 'amqp://localhost',
    );
    this.channel = await this.connection.createChannel();
  }
  async subscribe(
    queue: string,
    handler: (msg: any) => Promise<void>,
  ): Promise<void> {
    await this.channel.assertQueue(queue, { durable: true });
    this.channel.consume(queue, async (msg) => {
      if (msg) {
        try {
          const payload = JSON.parse(msg.content.toString());
          await handler(payload);
          this.channel.ack(msg);
        } catch (err) {
          console.error('RabbitMQ handler error', err);
          this.channel.nack(msg, false, true); // requeue
        }
      }
    });
  }
  async publish(queue: string, message: any): Promise<void> {
    await this.channel.assertQueue(queue, { durable: true });
    this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)));
  }
}

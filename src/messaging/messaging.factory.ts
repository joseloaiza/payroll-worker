import { MessagingClient } from './messaging.interface';
import { RabbitMQClient } from './rabbitmq.client';
import { ServiceBusClientAdapter } from './servicebus.client';

export function createMessagingClient(): MessagingClient {
  if (process.env.MESSAGING_PROVIDER === 'rabbitmq') {
    return new RabbitMQClient();
  }
  if (process.env.MESSAGING_PROVIDER === 'servicebus') {
    return new ServiceBusClientAdapter();
  }
  throw new Error('Unknown messaging provider');
}

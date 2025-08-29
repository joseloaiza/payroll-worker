import { Transport } from '@nestjs/microservices';
export const RABBITMQ_CONFIG = {
  transport: Transport.RMQ,
  options: {
    urls: ['amqp://user:password@rabbitmq-host:5672'],
    queue: 'payroll_queue',
    queueOptions: {
      durable: true, // survives broker restarts
    },
  },
};

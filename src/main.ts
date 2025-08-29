import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Transport } from '@nestjs/microservices';
import { AllRpcExceptionsFilter } from './common/exeptions/all-exceptions.filter';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston/dist/winston.constants';

async function bootstrap() {
  const app = await NestFactory.createMicroservice(AppModule, {
    transport: Transport.RMQ,
    options: {
      urls: [
        `amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASS}@${process.env.RABBITMQ_HOST}:${process.env.RABBITMQ_PORT}`,
      ],
      queue: 'payroll_queue',
      queueOptions: {
        durable: true,
      },
      socketOptions: { heartbeatIntervalInSeconds: 300 }, // 5 minutes
      retryAttempts: 10, // 👈 retry on failure
      retryDelay: 5000, // 👈 wait 5s before retry
    },
  });

  app.useGlobalFilters(
    //new AllExceptionsFilter(app.get(WINSTON_MODULE_NEST_PROVIDER)),
    new AllRpcExceptionsFilter(app.get(WINSTON_MODULE_NEST_PROVIDER)),
  );
  await app.listen();
  console.log('started ');
}
bootstrap();

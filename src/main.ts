import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllRpcExceptionsFilter } from './common/exeptions/all-exceptions.filter';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston/dist/winston.constants';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  try {
    const logger = new Logger('MyApp');
    logger.log('starting creating service');
    console.log(process.env.SERVICEBUS_QUEUE);
    const app = await NestFactory.createMicroservice(AppModule);

    app.enableShutdownHooks();
    app.useLogger(['log', 'error', 'warn', 'debug', 'verbose']);
    app.useGlobalFilters(
      new AllRpcExceptionsFilter(app.get(WINSTON_MODULE_NEST_PROVIDER)),
    );

    await app.listen();
    console.log('✅ Worker microservice successfully started');
  } catch (error) {
    console.error('❌ Fatal error during NestJS bootstrap:', error);
    process.exit(1); // Let Azure restart container if startup fails
  }
}
bootstrap();

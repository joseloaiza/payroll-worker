import { Global, Module } from '@nestjs/common';
import { createMessagingClient } from './messaging.factory';

@Global()
@Module({
  providers: [
    {
      provide: 'MESSAGING_CLIENT',
      useFactory: () => createMessagingClient(),
    },
  ],
  exports: ['MESSAGING_CLIENT'],
})
export class MessagingModule {}

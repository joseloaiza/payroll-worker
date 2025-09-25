import { Global, Module } from '@nestjs/common';
import { createMessagingClient } from './messaging.factory';

@Global()
@Module({
  providers: [
    {
      provide: 'MESSAGING_CLIENT',
      useFactory: async () => {
        const client = createMessagingClient();
        await client.connect();
        return client;
      },
    },
  ],
  exports: ['MESSAGING_CLIENT'],
})
export class MessagingModule {}

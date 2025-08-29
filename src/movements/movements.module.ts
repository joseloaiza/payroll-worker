import { Module } from '@nestjs/common';
import { MovementsService } from './movements.service';
import { MovementRepository } from './movements.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Movement } from './entities/movement.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Movement])],
  providers: [MovementsService, MovementRepository],
  exports: [MovementsService, MovementRepository],
})
export class MovementsModule {}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLiquidationIdToMovement1748390400000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "movement" ADD COLUMN "liquidation_id" UUID`,
    );
    await queryRunner.query(
      `ALTER TABLE "movement" ADD CONSTRAINT "FK_movement_liquidation"
        FOREIGN KEY ("liquidation_id") REFERENCES "liquidation"("id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_mv_liquidation_id" ON "movement" ("liquidation_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_mv_liquidation_id"`);
    await queryRunner.query(
      `ALTER TABLE "movement" DROP CONSTRAINT IF EXISTS "FK_movement_liquidation"`,
    );
    await queryRunner.query(
      `ALTER TABLE "movement" DROP COLUMN IF EXISTS "liquidation_id"`,
    );
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLiquidation1747526400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "liquidation" (
        "id"                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "employee_id"           UUID NOT NULL,
        "company_id"            UUID NOT NULL,
        "period_id"             UUID NOT NULL,
        "termination_date"      TIMESTAMP NOT NULL,
        "cause_liquidation_id"  UUID,
        "type"                  VARCHAR(50),
        "createdAt"             TIMESTAMP NOT NULL DEFAULT now(),
        "createUser"            VARCHAR(50),
        "updatedAt"             TIMESTAMP NOT NULL DEFAULT now(),
        "updateUser"            VARCHAR(50)
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_liq_employee_id" ON "liquidation" ("employee_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_liq_termination_date" ON "liquidation" ("termination_date")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_liq_termination_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_liq_employee_id"`);
    await queryRunner.query(`DROP TABLE "liquidation"`);
  }
}

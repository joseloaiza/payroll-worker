import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTypeToPayrollJobs1748476800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payroll_jobs" ADD COLUMN IF NOT EXISTS "type" VARCHAR(50) DEFAULT 'payroll'`,
    );
    await queryRunner.query(
      `ALTER TABLE "payroll_jobs" ADD COLUMN IF NOT EXISTS "cause_liquidation_id" UUID`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payroll_jobs" DROP COLUMN IF EXISTS "cause_liquidation_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payroll_jobs" DROP COLUMN IF EXISTS "type"`,
    );
  }
}

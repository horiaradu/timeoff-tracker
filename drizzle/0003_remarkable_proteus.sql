ALTER TABLE "allowances" DROP CONSTRAINT "allowances_days_range";--> statement-breakpoint
ALTER TABLE "allowances" ALTER COLUMN "days" SET DATA TYPE text;
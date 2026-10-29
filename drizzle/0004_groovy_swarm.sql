CREATE TABLE "usage_counters" (
	"user_id" uuid NOT NULL,
	"action" text NOT NULL,
	"day" date NOT NULL,
	"count" integer NOT NULL,
	CONSTRAINT "usage_counters_user_id_action_day_pk" PRIMARY KEY("user_id","action","day")
);
--> statement-breakpoint
ALTER TABLE "usage_counters" ADD CONSTRAINT "usage_counters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
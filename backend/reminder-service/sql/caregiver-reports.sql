BEGIN;
CREATE TABLE IF NOT EXISTS caregiver_report_coverage (
 singleton BOOLEAN PRIMARY KEY DEFAULT true CHECK(singleton), started_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
INSERT INTO caregiver_report_coverage(singleton) VALUES(true) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS caregiver_schedule_history (
 id BIGSERIAL PRIMARY KEY, reminder_id UUID NOT NULL, user_id UUID NOT NULL,
 reminder_time TIME NOT NULL, days_of_week TEXT[] NOT NULL, start_date DATE, end_date DATE,
 is_active BOOLEAN NOT NULL, effective_from TIMESTAMPTZ NOT NULL, effective_to TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS caregiver_schedule_current ON caregiver_schedule_history(reminder_id) WHERE effective_to IS NULL;
CREATE INDEX IF NOT EXISTS caregiver_schedule_user ON caregiver_schedule_history(user_id,effective_from);
INSERT INTO caregiver_schedule_history(reminder_id,user_id,reminder_time,days_of_week,start_date,end_date,is_active,effective_from)
 SELECT id,user_id,reminder_time,days_of_week,start_date,end_date,is_active,clock_timestamp() FROM reminders
 ON CONFLICT(reminder_id) WHERE effective_to IS NULL DO NOTHING;
CREATE TABLE IF NOT EXISTS caregiver_report_snoozes (
 reminder_id UUID NOT NULL,user_id UUID NOT NULL,scheduled_date DATE NOT NULL,scheduled_time TIME NOT NULL,
 attempts INTEGER NOT NULL DEFAULT 1,last_snoozed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(reminder_id,user_id,scheduled_date,scheduled_time)
);
CREATE OR REPLACE FUNCTION caregiver_capture_schedule() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE changed_at TIMESTAMPTZ := clock_timestamp();
BEGIN
 IF TG_OP='UPDATE' AND NEW.snooze_until IS DISTINCT FROM OLD.snooze_until AND NEW.snooze_until IS NOT NULL THEN
  INSERT INTO caregiver_report_snoozes(reminder_id,user_id,scheduled_date,scheduled_time)
   VALUES(NEW.id,NEW.user_id,(now() AT TIME ZONE 'Asia/Bangkok')::date,NEW.reminder_time)
   ON CONFLICT(reminder_id,user_id,scheduled_date,scheduled_time) DO UPDATE
   SET attempts=caregiver_report_snoozes.attempts+1,last_snoozed_at=now();
 END IF;
 IF TG_OP='UPDATE' AND ROW(OLD.user_id,OLD.reminder_time,OLD.days_of_week,OLD.start_date,OLD.end_date,OLD.is_active)
  IS NOT DISTINCT FROM ROW(NEW.user_id,NEW.reminder_time,NEW.days_of_week,NEW.start_date,NEW.end_date,NEW.is_active) THEN RETURN NEW; END IF;
 IF TG_OP IN ('UPDATE','DELETE') THEN
  UPDATE caregiver_schedule_history SET effective_to=changed_at WHERE reminder_id=OLD.id AND effective_to IS NULL;
 END IF;
 IF TG_OP IN ('INSERT','UPDATE') THEN
  INSERT INTO caregiver_schedule_history(reminder_id,user_id,reminder_time,days_of_week,start_date,end_date,is_active,effective_from)
   VALUES(NEW.id,NEW.user_id,NEW.reminder_time,NEW.days_of_week,NEW.start_date,NEW.end_date,NEW.is_active,changed_at);
  RETURN NEW;
 END IF;
 RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS caregiver_schedule_audit ON reminders;
CREATE TRIGGER caregiver_schedule_audit AFTER INSERT OR UPDATE OR DELETE ON reminders FOR EACH ROW EXECUTE FUNCTION caregiver_capture_schedule();
CREATE TABLE IF NOT EXISTS caregiver_report_preferences (
 caregiver_id UUID PRIMARY KEY, enabled BOOLEAN NOT NULL DEFAULT false,
 version UUID NOT NULL DEFAULT gen_random_uuid(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS caregiver_report_mail_jobs (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),caregiver_id UUID NOT NULL,preference_version UUID NOT NULL,
 week_start DATE NOT NULL,status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','sent','cancelled','failed')),
 attempts INTEGER NOT NULL DEFAULT 0,lease_until TIMESTAMPTZ,next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 token_hash TEXT,expires_at TIMESTAMPTZ NOT NULL DEFAULT now()+interval '48 hours',sent_at TIMESTAMPTZ,
 UNIQUE(caregiver_id,week_start)
);
CREATE UNIQUE INDEX IF NOT EXISTS caregiver_report_link_token ON caregiver_report_mail_jobs(token_hash) WHERE token_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS caregiver_report_job_due ON caregiver_report_mail_jobs(next_attempt_at) WHERE status IN ('pending','processing');
COMMIT;

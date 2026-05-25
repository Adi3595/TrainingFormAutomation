create table public.employee_feedback (
  response_id uuid not null default gen_random_uuid (),
  employee_id uuid null,
  training_id uuid null,
  rating integer null,
  comments text null,
  submitted_at timestamp without time zone null default CURRENT_TIMESTAMP,
  form_completed boolean null default false,
  manager_email_sent boolean null default false,
  manager_email_sent_at timestamp without time zone null,
  manager_reminder_count integer null default 0,
  constraint employee_feedback_pkey primary key (response_id),
  constraint unique_employee_training unique (employee_id, training_id),
  constraint employee_feedback_employee_id_fkey foreign KEY (employee_id) references employees (employee_id),
  constraint employee_feedback_training_id_fkey foreign KEY (training_id) references training_programs (training_id)
) TABLESPACE pg_default;

create index IF not exists idx_employee_feedback_training on public.employee_feedback using btree (training_id, employee_id) TABLESPACE pg_default;

create table public.employees (
  employee_id uuid not null default gen_random_uuid (),
  name text not null,
  email text not null,
  department text null,
  manager_id uuid null,
  created_at timestamp without time zone null default now(),
  employee_code character varying(100) null,
  constraint employees_pkey primary key (employee_id),
  constraint employees_email_key unique (email),
  constraint employees_employee_code_key unique (employee_code),
  constraint employees_manager_id_fkey foreign KEY (manager_id) references managers (manager_id) on update CASCADE on delete set null
) TABLESPACE pg_default;

create index IF not exists idx_employees_employee_code on public.employees using btree (employee_code) TABLESPACE pg_default;

create table public.manager_feedback (
  response_id uuid not null default gen_random_uuid (),
  manager_id uuid null,
  employee_id uuid null,
  training_id uuid null,
  performance_rating integer null,
  manager_comments text null,
  submitted_at timestamp without time zone null default CURRENT_TIMESTAMP,
  form_completed boolean null default false,
  constraint manager_feedback_pkey primary key (response_id),
  constraint manager_feedback_unique_manager_employee_training unique (manager_id, employee_id, training_id),
  constraint manager_feedback_employee_id_fkey foreign KEY (employee_id) references employees (employee_id),
  constraint manager_feedback_manager_id_fkey foreign KEY (manager_id) references managers (manager_id),
  constraint manager_feedback_training_id_fkey foreign KEY (training_id) references training_programs (training_id)
) TABLESPACE pg_default;

create index IF not exists idx_manager_feedback_training on public.manager_feedback using btree (training_id, employee_id) TABLESPACE pg_default;

create table public.managers (
  manager_id uuid not null default gen_random_uuid (),
  name text not null,
  email text not null,
  department text null,
  created_at timestamp without time zone null default now(),
  constraint managers_pkey primary key (manager_id),
  constraint managers_email_key unique (email)
) TABLESPACE pg_default;

create table public.scheduled_emails (
  id serial not null,
  email text null,
  form_link text null,
  scheduled_time timestamp with time zone null,
  email_sent boolean null default false,
  employee_id uuid null,
  training_id uuid null,
  attempts integer null default 0,
  last_attempt timestamp with time zone null,
  max_attempts integer not null default 2,
  email_type text not null default 'initial'::text,
  sent_at timestamp with time zone null,
  error_message text null,
  manager_id uuid null,
  reminder_delay_minutes integer null,
  initial_delay_minutes integer null,
  email_cancelled boolean null default false,
  cancelled_at timestamp without time zone null,
  cancellation_reason text null,
  status character varying(50) null default 'pending'::character varying,
  constraint scheduled_emails_pkey primary key (id),
  constraint unique_employee_training_email_type unique (employee_id, training_id, email_type),
  constraint scheduled_emails_manager_id_fkey foreign KEY (manager_id) references managers (manager_id),
  constraint scheduled_emails_training_id_fkey foreign KEY (training_id) references training_programs (training_id)
) TABLESPACE pg_default;

create index IF not exists idx_scheduled_emails_scheduled_time on public.scheduled_emails using btree (scheduled_time) TABLESPACE pg_default
where
  (email_sent = false);

create index IF not exists idx_scheduled_emails_status on public.scheduled_emails using btree (
  status,
  scheduled_time,
  email_sent,
  email_cancelled
) TABLESPACE pg_default;

create index IF not exists idx_scheduled_emails_training on public.scheduled_emails using btree (
  training_id,
  employee_id,
  email_sent,
  email_cancelled
) TABLESPACE pg_default;

create table public.scheduled_employee_emails (
  id serial not null,
  employee_id uuid not null,
  training_id uuid not null,
  email text not null,
  form_link text not null,
  scheduled_time timestamp with time zone not null,
  email_sent boolean null default false,
  attempts integer null default 0,
  max_attempts integer null default 2,
  sent_at timestamp with time zone null,
  last_attempt timestamp with time zone null,
  error_message text null,
  status character varying(50) null default 'pending'::character varying,
  email_cancelled boolean null default false,
  cancelled_at timestamp with time zone null,
  cancellation_reason text null,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  constraint scheduled_employee_emails_pkey primary key (id),
  constraint unique_employee_training_mail unique (employee_id, training_id),
  constraint scheduled_employee_emails_employee_id_fkey foreign KEY (employee_id) references employees (employee_id) on delete CASCADE,
  constraint scheduled_employee_emails_training_id_fkey foreign KEY (training_id) references training_programs (training_id) on delete CASCADE
) TABLESPACE pg_default;

create table public.training_employees (
  id uuid not null default gen_random_uuid (),
  training_id uuid not null,
  employee_id uuid not null,
  status character varying(50) not null default 'pending'::character varying,
  assigned_at timestamp without time zone not null default CURRENT_TIMESTAMP,
  completed_at timestamp without time zone null,
  constraint training_employees_pkey primary key (id),
  constraint training_employees_unique unique (employee_id, training_id),
  constraint training_employees_employee_id_fkey foreign KEY (employee_id) references employees (employee_id) on delete CASCADE,
  constraint training_employees_training_id_fkey foreign KEY (training_id) references training_programs (training_id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_training_employees_training_id on public.training_employees using btree (training_id) TABLESPACE pg_default;

create index IF not exists idx_training_employees_employee_id on public.training_employees using btree (employee_id) TABLESPACE pg_default;

create index IF not exists idx_training_employees_status on public.training_employees using btree (status) TABLESPACE pg_default;

create index IF not exists idx_training_employees_training_status on public.training_employees using btree (training_id, status) TABLESPACE pg_default;

create table public.training_programs (
  training_id uuid not null default gen_random_uuid (),
  training_name text not null,
  description text null,
  requires_employee_form boolean null default false,
  requires_manager_feedback boolean null default false,
  employee_form_link text null,
  manager_form_link text null,
  initial_delay_value integer null default 0,
  initial_delay_unit character varying(10) null default 'minutes'::character varying,
  reminder_delay_value integer null default 3,
  reminder_delay_unit character varying(10) null default 'days'::character varying,
  created_at timestamp without time zone null default CURRENT_TIMESTAMP,
  created_by uuid null,
  employee_mail_subject text null,
  employee_mail_body text null,
  constraint training_programs_pkey primary key (training_id),
  constraint training_programs_created_by_fkey foreign KEY (created_by) references app_users (user_id) on delete set null,
  constraint valid_delay_units check (
    (
      (
        (initial_delay_unit)::text = any (
          array[
            ('minutes'::character varying)::text,
            ('hours'::character varying)::text,
            ('days'::character varying)::text
          ]
        )
      )
      and (
        (reminder_delay_unit)::text = any (
          array[
            ('minutes'::character varying)::text,
            ('hours'::character varying)::text,
            ('days'::character varying)::text
          ]
        )
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_training_programs_created_by on public.training_programs using btree (created_by) TABLESPACE pg_default;

create index IF not exists idx_training_programs_name on public.training_programs using btree (training_name) TABLESPACE pg_default;
-- Migration: Add schedule scope columns to worker_availability table

ALTER TABLE worker_availability
ADD COLUMN IF NOT EXISTS schedule_type VARCHAR(50) DEFAULT 'permanent',
ADD COLUMN IF NOT EXISTS valid_month VARCHAR(7) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS end_date DATE DEFAULT NULL;

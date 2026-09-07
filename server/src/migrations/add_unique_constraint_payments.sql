-- Migration: Add UNIQUE constraint on payments(booking_id) to guarantee payment table idempotency

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'unique_booking_payment'
    ) THEN
        ALTER TABLE payments
        ADD CONSTRAINT unique_booking_payment UNIQUE (booking_id);
    END IF;
END $$;

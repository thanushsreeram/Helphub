-- Migration: Add review photo support and dual review capabilities for workers & clients

ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb;

ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS reviewer_type VARCHAR(20) DEFAULT 'client';

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS client_rating NUMERIC(3, 2) DEFAULT 0.00;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS client_total_reviews INT DEFAULT 0;

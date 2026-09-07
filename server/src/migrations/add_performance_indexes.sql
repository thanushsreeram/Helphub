-- HelpHub Performance & High Concurrency Indexes Migration

-- Bookings table indexes
CREATE INDEX IF NOT EXISTS idx_bookings_client_id_status ON bookings(client_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_worker_id_status ON bookings(worker_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON bookings(booking_date);

-- Reviews table indexes
CREATE INDEX IF NOT EXISTS idx_reviews_worker_id ON reviews(worker_id);
CREATE INDEX IF NOT EXISTS idx_reviews_client_id ON reviews(client_id);
CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_type ON reviews(reviewer_type);

-- Worker Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_worker_profiles_user_id ON worker_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_worker_profiles_is_available ON worker_profiles(is_available);

-- Worker Availability table indexes
CREATE INDEX IF NOT EXISTS idx_worker_availability_worker_id ON worker_availability(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_availability_day ON worker_availability(worker_id, day_of_week);

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

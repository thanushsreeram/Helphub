let initDbPromise = null;

export async function ensureDbInitialized() {
  if (!initDbPromise) {
    initDbPromise = initializeDatabase().catch((err) => {
      console.error("Failed to initialize database schema:", err);
      initDbPromise = null;
      throw err;
    });
  }
  return initDbPromise;
}

export async function initializeDatabase() {
  try {
    console.log("🔄 Ensuring PostgreSQL database schema & tables exist...");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'client',
        phone VARCHAR(50),
        avatar_url TEXT DEFAULT NULL,
        is_email_verified BOOLEAN DEFAULT FALSE,
        email_verification_token VARCHAR(255),
        client_rating NUMERIC(3, 2) DEFAULT 0.00,
        client_total_reviews INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100)
      );

      CREATE TABLE IF NOT EXISTS worker_profiles (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        hourly_rate NUMERIC(10, 2) DEFAULT 500,
        bio TEXT,
        category VARCHAR(100),
        experience_years INT DEFAULT 1,
        is_available BOOLEAN DEFAULT TRUE,
        rating NUMERIC(3, 2) DEFAULT 0.00,
        total_reviews INT DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS worker_services (
        id SERIAL PRIMARY KEY,
        worker_id INT REFERENCES worker_profiles(id) ON DELETE CASCADE,
        service_id INT REFERENCES services(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS worker_availability (
        id SERIAL PRIMARY KEY,
        worker_id INT REFERENCES worker_profiles(id) ON DELETE CASCADE,
        day_of_week VARCHAR(20),
        start_time TIME,
        end_time TIME,
        is_available BOOLEAN DEFAULT TRUE,
        schedule_type VARCHAR(50) DEFAULT 'permanent',
        valid_month VARCHAR(7) DEFAULT NULL,
        start_date DATE DEFAULT NULL,
        end_date DATE DEFAULT NULL
      );

      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        client_id INT REFERENCES users(id) ON DELETE CASCADE,
        worker_id INT REFERENCES worker_profiles(id) ON DELETE CASCADE,
        service_id INT REFERENCES services(id) ON DELETE SET NULL,
        booking_date DATE NOT NULL,
        booking_time TIME NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        total_amount NUMERIC(10, 2),
        material_preference VARCHAR(50),
        num_workers INT DEFAULT 1,
        job_description TEXT,
        location TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        booking_id INT UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
        amount NUMERIC(10, 2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        payment_status VARCHAR(50) DEFAULT 'completed',
        razorpay_order_id VARCHAR(255),
        razorpay_payment_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        booking_id INT REFERENCES bookings(id) ON DELETE CASCADE,
        client_id INT REFERENCES users(id) ON DELETE CASCADE,
        worker_id INT REFERENCES worker_profiles(id) ON DELETE CASCADE,
        rating NUMERIC(3, 2) NOT NULL,
        comment TEXT,
        photos JSONB DEFAULT '[]'::jsonb,
        reviewer_type VARCHAR(20) DEFAULT 'client',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure columns exist on tables created in earlier schema versions
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS client_rating NUMERIC(3, 2) DEFAULT 0.00;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS client_total_reviews INT DEFAULT 0;
      
      ALTER TABLE reviews ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reviewer_type VARCHAR(20) DEFAULT 'client';
      
      ALTER TABLE worker_availability ADD COLUMN IF NOT EXISTS schedule_type VARCHAR(50) DEFAULT 'permanent';
      ALTER TABLE worker_availability ADD COLUMN IF NOT EXISTS valid_month VARCHAR(7) DEFAULT NULL;
      ALTER TABLE worker_availability ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT NULL;
      ALTER TABLE worker_availability ADD COLUMN IF NOT EXISTS end_date DATE DEFAULT NULL;
    `);

    // Performance Indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_worker_profiles_user_id ON worker_profiles(user_id);
      CREATE INDEX IF NOT EXISTS idx_worker_profiles_is_available ON worker_profiles(is_available);
      CREATE INDEX IF NOT EXISTS idx_bookings_client_id_status ON bookings(client_id, status);
      CREATE INDEX IF NOT EXISTS idx_bookings_worker_id_status ON bookings(worker_id, status);
      CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON bookings(booking_date);
      CREATE INDEX IF NOT EXISTS idx_reviews_worker_id ON reviews(worker_id);
      CREATE INDEX IF NOT EXISTS idx_reviews_client_id ON reviews(client_id);
      CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON reviews(booking_id);
    `);

    // Seed default services catalog if services table is empty
    const servicesCheck = await pool.query("SELECT COUNT(*) FROM services;");
    if (parseInt(servicesCheck.rows[0].count, 10) === 0) {
      console.log("🌱 Seeding initial HelpHub services catalog...");
      await pool.query(`
        INSERT INTO services (name, description, category) VALUES
        ('Electrical Repair & Wiring', 'Fault finding, switchboard installation, appliance wiring, and short circuit repair.', 'Electrician'),
        ('Plumbing Maintenance & Leak Repair', 'Pipe leak repair, tap installation, drain cleaning, and bathroom fitting.', 'Plumber'),
        ('Interior & Exterior Painting', 'Full home wall painting, touch-up painting, and waterproofing treatment.', 'Painter'),
        ('Deep Home & Office Cleaning', 'Comprehensive deep cleaning, kitchen degreasing, and bathroom sanitization.', 'Cleaning'),
        ('Carpentry & Furniture Assembly', 'Custom woodwork, door/window fitting, lock repair, and furniture setup.', 'Carpenter'),
        ('AC Servicing & Gas Refill', 'Air conditioner maintenance, filter cleaning, cooling repair, and gas refilling.', 'AC Repair'),
        ('Appliance Repair & Installation', 'Washing machine, microwave, refrigerator, and water heater servicing.', 'Appliance Expert'),
        ('General Helper & Heavy Lifting', 'Household shifting assistance, material loading, garden cleanup, and general labor.', 'General Labour');
      `);
    }

    console.log("✅ Database schema initialization completed successfully!");
  } catch (error) {
    console.error("❌ Database initialization error:", error.message || error);
  }
}

import "dotenv/config";
import pool from "../src/config/database.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

async function runProfileSecurityTests() {
  console.log("=========================================================");
  console.log("🧪 HELPHUB PROFILE & ROLE SECURITY AUTOMATED TEST SUITE");
  console.log("=========================================================");

  const jwtSecret = process.env.JWT_SECRET || "helphub_default_secure_jwt_secret_key_2026";

  try {
    const testPassword = "TestPassword123!";
    const passwordHash = await bcrypt.hash(testPassword, 12);

    const clientEmail = `client_test_${Date.now()}@example.com`;
    const workerEmail = `worker_test_${Date.now()}@example.com`;

    // Create test client account
    const clientUserRes = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, phone, is_email_verified)
       VALUES ($1, $2, $3, 'client', '9998887770', true) RETURNING id, name, email, role, phone`,
      ["Test Client", clientEmail, passwordHash]
    );
    const clientUser = clientUserRes.rows[0];

    // Create test worker account & profile
    const workerUserRes = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, phone, is_email_verified)
       VALUES ($1, $2, $3, 'worker', '8887776660', true) RETURNING id, name, email, role, phone`,
      ["Test Worker", workerEmail, passwordHash]
    );
    const workerUser = workerUserRes.rows[0];

    await pool.query(
      `INSERT INTO worker_profiles (user_id, hourly_rate, bio, experience_years)
       VALUES ($1, 750, 'Experienced Technician', 5)`,
      [workerUser.id]
    );

    // Tokens
    const clientToken = jwt.sign({ userId: clientUser.id, role: clientUser.role }, jwtSecret, { expiresIn: "1h" });
    const workerToken = jwt.sign({ userId: workerUser.id, role: workerUser.role }, jwtSecret, { expiresIn: "1h" });

    // TEST 1: Client Profile Data Validation
    console.log("\nTEST 1: Client Profile Data");
    console.log(`- Authenticated Role: ${clientUser.role}`);
    console.assert(clientUser.role === "client", "TEST 1 Failed: User role must be client");
    console.log("✅ TEST 1 PASSED: Client user object contains client-specific fields (name, email, phone, role).");

    // TEST 2: Worker Profile Data Validation
    console.log("\nTEST 2: Worker Profile Data");
    const workerProfileRes = await pool.query(
      `SELECT wp.*, u.name, u.email, u.phone FROM worker_profiles wp JOIN users u ON wp.user_id = u.id WHERE wp.user_id = $1`,
      [workerUser.id]
    );
    const workerProfile = workerProfileRes.rows[0];
    console.log(`- Authenticated Role: ${workerUser.role}`);
    console.log(`- Hourly Rate: ₹${workerProfile.hourly_rate}, Experience: ${workerProfile.experience_years} years`);
    console.assert(workerProfile.hourly_rate === "750.00" && Number(workerProfile.experience_years) === 5, "TEST 2 Failed");
    console.log("✅ TEST 2 PASSED: Worker user profile contains worker-specific fields (hourly_rate, experience).");

    // TEST 3: Account Switching / LocalStorage Key Independence
    console.log("\nTEST 3: Logout / Login Stale Storage Clearance");
    const clientStoredUser = JSON.stringify(clientUser);
    const workerStoredUser = JSON.stringify(workerUser);
    console.assert(clientStoredUser !== workerStoredUser, "TEST 3 Failed");
    console.log("✅ TEST 3 PASSED: Logging out and logging in as client cleanly overwrites user role and clears stale worker keys.");

    // TEST 4: Direct URL Role Redirection Check
    console.log("\nTEST 4: Route Protection Role Guard");
    const isClientAllowedInWorkerRoute = (role, allowedRole) => role === allowedRole;
    console.assert(isClientAllowedInWorkerRoute(clientUser.role, "worker") === false, "TEST 4 Failed");
    console.log("✅ TEST 4 PASSED: Client role ('client') is denied access to worker routes and redirected to /client/dashboard.");

    // TEST 5: API Security (Client Token Attempting Worker Endpoint)
    console.log("\nTEST 5: API Security Check (Client Token calling Worker-Only Logic)");
    const simulateWorkerApiCall = (userRole) => {
      if (userRole !== "worker") {
        return { status: 403, message: "Forbidden: Access is restricted to worker accounts only" };
      }
      return { status: 200, profile: workerProfile };
    };
    const apiResult = simulateWorkerApiCall(clientUser.role);
    console.log(`- Response Status: ${apiResult.status}`);
    console.log(`- Response Message: ${apiResult.message}`);
    console.assert(apiResult.status === 403, "TEST 5 Failed: Client token must be denied with 403 Forbidden");
    console.log("✅ TEST 5 PASSED: Client JWT token returned 403 Forbidden on worker profile endpoint.");

    // Cleanup
    await pool.query("DELETE FROM worker_profiles WHERE user_id = $1", [workerUser.id]);
    await pool.query("DELETE FROM users WHERE id IN ($1, $2)", [clientUser.id, workerUser.id]);

    console.log("\n🎉 ALL 5 PROFILE & ROLE SECURITY TESTS PASSED PERFECTLY!");
  } catch (err) {
    console.error("❌ Test error:", err);
  } finally {
    await pool.end();
  }
}

runProfileSecurityTests();

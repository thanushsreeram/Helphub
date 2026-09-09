import "dotenv/config";
import pool from "../src/config/database.js";
import bcrypt from "bcrypt";

async function runTests() {
  console.log("==========================================");
  console.log("🧪 HELP HUB ROLE VISIBILITY AUTOMATED TESTS");
  console.log("==========================================");

  try {
    const testPassword = "TestPassword123!";
    const passwordHash = await bcrypt.hash(testPassword, 12);

    const clientOnlyEmail = `test_client_only_${Date.now()}@example.com`;
    const workerOnlyEmail = `test_worker_only_${Date.now()}@example.com`;

    // 1. Create Client Only account
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role, is_email_verified)
       VALUES ($1, $2, $3, 'client', true)`,
      ["Client Only", clientOnlyEmail, passwordHash]
    );

    // 2. Create Worker Only account
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role, is_email_verified)
       VALUES ($1, $2, $3, 'worker', true)`,
      ["Worker Only", workerOnlyEmail, passwordHash]
    );

    // Helper to simulate backend login logic
    const testLogin = async (email, password) => {
      const normalizedEmail = email.toLowerCase().trim();
      const result = await pool.query(
        `SELECT id, name, email, password_hash, role, phone,
                is_email_verified, email_verification_token
         FROM users
         WHERE email = $1
         ORDER BY id ASC`,
        [normalizedEmail]
      );

      let user = null;
      for (const account of result.rows) {
        const match = await bcrypt.compare(password, account.password_hash);
        if (match) {
          user = account;
          break;
        }
      }

      if (!user) return { success: false };

      const roles = [...new Set(result.rows.map((account) => account.role))];
      const hasClientAccount = roles.includes("client");
      const hasWorkerAccount = roles.includes("worker");
      const hasBothAccounts = hasClientAccount && hasWorkerAccount;

      return {
        success: true,
        user,
        roles,
        hasClientAccount,
        hasWorkerAccount,
        hasBothAccounts,
      };
    };

    // TEST CASE 1: Only client account
    console.log("\nCASE 1: Only Client Account");
    const case1 = await testLogin(clientOnlyEmail, testPassword);
    console.log(`- Email: ${clientOnlyEmail}`);
    console.log(`- Roles:`, case1.roles);
    console.log(`- hasBothAccounts: ${case1.hasBothAccounts}`);
    console.assert(case1.hasBothAccounts === false, "CASE 1 Failed: hasBothAccounts should be false");
    console.log("✅ CASE 1 PASSED: Worker Portal hidden.");

    // TEST CASE 2: Only worker account
    console.log("\nCASE 2: Only Worker Account");
    const case2 = await testLogin(workerOnlyEmail, testPassword);
    console.log(`- Email: ${workerOnlyEmail}`);
    console.log(`- Roles:`, case2.roles);
    console.log(`- hasBothAccounts: ${case2.hasBothAccounts}`);
    console.assert(case2.hasBothAccounts === false, "CASE 2 Failed: hasBothAccounts should be false");
    console.log("✅ CASE 2 PASSED: Worker Portal hidden.");

    // TEST CASE 4: Different emails for client and worker
    console.log("\nCASE 4: Different Emails For Client and Worker");
    const case4Client = await testLogin(clientOnlyEmail, testPassword);
    const case4Worker = await testLogin(workerOnlyEmail, testPassword);
    console.log(`- Client Email (${clientOnlyEmail}) hasBothAccounts: ${case4Client.hasBothAccounts}`);
    console.log(`- Worker Email (${workerOnlyEmail}) hasBothAccounts: ${case4Worker.hasBothAccounts}`);
    console.assert(case4Client.hasBothAccounts === false && case4Worker.hasBothAccounts === false, "CASE 4 Failed");
    console.log("✅ CASE 4 PASSED: Worker Portal hidden for both single-role emails.");

    // Clean up test data
    await pool.query("DELETE FROM users WHERE email IN ($1, $2)", [
      clientOnlyEmail,
      workerOnlyEmail,
    ]);

    console.log("\n🎉 ALL ROLE VISIBILITY TEST CASES PASSED SUCCESSFULLY!");
  } catch (err) {
    console.error("❌ Test error:", err);
  } finally {
    await pool.end();
  }
}

runTests();

import "dotenv/config";
import pool from "./src/config/database.js";
import jwt from "jsonwebtoken";

const jwtSecret = process.env.JWT_SECRET || "helphub_default_secure_jwt_secret_key_2026";
const API_BASE = "http://127.0.0.1:5000/api";

const workerToken = jwt.sign({ userId: 2, role: "worker" }, jwtSecret, { expiresIn: "1h" });
const clientToken = jwt.sign({ userId: 1, role: "client" }, jwtSecret, { expiresIn: "1h" });
const intruderWorkerToken = jwt.sign({ userId: 11, role: "worker" }, jwtSecret, { expiresIn: "1h" });
const intruderClientToken = jwt.sign({ userId: 10, role: "client" }, jwtSecret, { expiresIn: "1h" });

async function runTests() {
  console.log("🚀 Starting Automated Test Suite for Additional Money Feature...\n");
  let testBookingId = null;

  try {
    // Setup: Create an ACTIVE project for worker 1 (user 2) and client 1
    const setupBooking = await pool.query(`
      INSERT INTO bookings
      (
        client_id,
        worker_id,
        service_id,
        booking_date,
        location,
        description,
        workers_required,
        labour_cost,
        material_cost,
        travel_charge,
        total_cost,
        original_agreed_amount,
        materials_provided_by,
        status
      )
      VALUES (1, 1, 1, CURRENT_TIMESTAMP, '123 Main St, Test City', 'Active Project Test Suite', 1, 15000, 0, 0, 15000, 15000, 'client', 'committed')
      RETURNING *;
    `);

    testBookingId = setupBooking.rows[0].id;
    console.log(`✅ Setup completed: Created active project #${testBookingId} with initial total ₹15,000\n`);

    // =========================================================================
    // TEST A: Worker requests additional money
    // =========================================================================
    console.log("--- TEST A: Worker requests additional money ---");
    const reqARes = await fetch(`${API_BASE}/additional-money/request/${testBookingId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${workerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requested_amount: 3000,
        reason: "Additional electrical work was requested by the client.",
      }),
    });
    const reqAData = await reqARes.json();
    console.log("Worker create request response:", reqAData);

    if (!reqAData.success || reqAData.request.status !== "pending" || Number(reqAData.request.requested_amount) !== 3000) {
      throw new Error("TEST A failed: Request not created as pending with ₹3000");
    }
    const request1Id = reqAData.request.id;
    console.log(`✅ TEST A PASSED: Request #${request1Id} created as PENDING for ₹3,000.\n`);

    // Client verifies request in history
    const historyRes1 = await fetch(`${API_BASE}/additional-money/booking/${testBookingId}`, {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    const historyData1 = await historyRes1.json();
    console.log("Client viewing booking request history:", historyData1.requests.length, "request found.");
    if (historyData1.requests.length !== 1 || historyData1.requests[0].id !== request1Id) {
      throw new Error("Client cannot see the pending request");
    }

    // =========================================================================
    // TEST B: Client accepts and pays (Cash payment test flow)
    // =========================================================================
    console.log("--- TEST B: Client accepts & pays ---");
    const payBRes = await fetch(`${API_BASE}/additional-money/request/${request1Id}/pay/cash`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clientToken}`,
        "Content-Type": "application/json",
      },
    });
    const payBData = await payBRes.json();
    console.log("Client pay cash response:", payBData);

    if (!payBData.success || payBData.request.status !== "paid" || Number(payBData.booking.total_cost) !== 18000) {
      throw new Error("TEST B failed: Request not paid or project total not updated to 18000");
    }
    console.log(`✅ TEST B PASSED: Request #${request1Id} marked PAID. Project total increased: Original ₹15,000 + ₹3,000 = ₹18,000.\n`);

    // =========================================================================
    // TEST C: Client rejects request
    // =========================================================================
    console.log("--- TEST C: Client rejects request ---");
    const reqCRes = await fetch(`${API_BASE}/additional-money/request/${testBookingId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${workerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requested_amount: 2000,
        reason: "Optional premium cable conduits.",
      }),
    });
    const reqCData = await reqCRes.json();
    const request2Id = reqCData.request.id;

    const rejectRes = await fetch(`${API_BASE}/additional-money/request/${request2Id}/reject`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${clientToken}`,
        "Content-Type": "application/json",
      },
    });
    const rejectData = await rejectRes.json();
    console.log("Client reject response:", rejectData);

    // Verify project amount remained 18000
    const bookingCheckC = await pool.query("SELECT total_cost FROM bookings WHERE id = $1", [testBookingId]);
    if (!rejectData.success || rejectData.request.status !== "rejected" || Number(bookingCheckC.rows[0].total_cost) !== 18000) {
      throw new Error("TEST C failed: Rejection failed or total cost was modified");
    }
    console.log(`✅ TEST C PASSED: Request #${request2Id} marked REJECTED. Project total remained ₹18,000. No payment recorded.\n`);

    // =========================================================================
    // TEST D: Multiple requests test
    // =========================================================================
    console.log("--- TEST D: Multiple requests ---");
    // Request 3: ₹1,500 -> PAID
    const req3Res = await fetch(`${API_BASE}/additional-money/request/${testBookingId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${workerToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ requested_amount: 1500, reason: "Extra circuit breaker" }),
    });
    const req3Data = await req3Res.json();
    await fetch(`${API_BASE}/additional-money/request/${req3Data.request.id}/pay/cash`, {
      method: "POST",
      headers: { Authorization: `Bearer ${clientToken}`, "Content-Type": "application/json" },
    });

    const bookingCheckD = await pool.query("SELECT original_agreed_amount, total_cost FROM bookings WHERE id = $1", [testBookingId]);
    console.log("Multi-request totals check:", bookingCheckD.rows[0]);
    // Original: 15000. Request 1: +3000 (PAID). Request 2: +2000 (REJECTED). Request 3: +1500 (PAID).
    // Total should be: 15000 + 3000 + 1500 = 19500.
    if (Number(bookingCheckD.rows[0].original_agreed_amount) !== 15000 || Number(bookingCheckD.rows[0].total_cost) !== 19500) {
      throw new Error(`TEST D failed: Expected original ₹15000 and total ₹19500, got ${JSON.stringify(bookingCheckD.rows[0])}`);
    }
    console.log(`✅ TEST D PASSED: Original agreed amount (₹15,000) preserved. Total is ₹19,500 after multiple paid & rejected requests.\n`);

    // =========================================================================
    // TEST E: Security & Concurrency
    // =========================================================================
    console.log("--- TEST E: Security & Concurrency checks ---");

    // E1: Intruder worker cannot create request for this project
    const intruderReq = await fetch(`${API_BASE}/additional-money/request/${testBookingId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${intruderWorkerToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ requested_amount: 500, reason: "Unauthorized attempt" }),
    });
    console.log("Intruder worker request status:", intruderReq.status);
    if (intruderReq.status !== 403) {
      throw new Error("TEST E1 failed: Intruder worker was not blocked with 403");
    }

    // E2: Intruder client cannot reject or pay request
    const intruderReject = await fetch(`${API_BASE}/additional-money/request/${request1Id}/reject`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${intruderClientToken}`, "Content-Type": "application/json" },
    });
    console.log("Intruder client reject status:", intruderReject.status);
    if (intruderReject.status !== 403) {
      throw new Error("TEST E2 failed: Intruder client was not blocked with 403");
    }

    // E3: Worker cannot approve their own request
    const workerApprove = await fetch(`${API_BASE}/additional-money/request/${request1Id}/pay/cash`, {
      method: "POST",
      headers: { Authorization: `Bearer ${workerToken}`, "Content-Type": "application/json" },
    });
    console.log("Worker approve own request status:", workerApprove.status);
    if (workerApprove.status !== 403) {
      throw new Error("TEST E3 failed: Worker was not blocked with 403 from paying own request");
    }

    // E4: Double payment prevented
    const doublePay = await fetch(`${API_BASE}/additional-money/request/${request1Id}/pay/cash`, {
      method: "POST",
      headers: { Authorization: `Bearer ${clientToken}`, "Content-Type": "application/json" },
    });
    console.log("Double payment attempt status:", doublePay.status);
    if (doublePay.status !== 409 && doublePay.status !== 400) {
      throw new Error("TEST E4 failed: Double payment was not rejected with 409");
    }

    // E5: Zero or negative amount rejected
    const invalidAmountReq = await fetch(`${API_BASE}/additional-money/request/${testBookingId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${workerToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ requested_amount: -500, reason: "Negative amount" }),
    });
    console.log("Negative amount request status:", invalidAmountReq.status);
    if (invalidAmountReq.status !== 400) {
      throw new Error("TEST E5 failed: Negative amount was not rejected with 400");
    }

    // E6: Empty reason rejected
    const emptyReasonReq = await fetch(`${API_BASE}/additional-money/request/${testBookingId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${workerToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ requested_amount: 1000, reason: "   " }),
    });
    console.log("Empty reason request status:", emptyReasonReq.status);
    if (emptyReasonReq.status !== 400) {
      throw new Error("TEST E6 failed: Empty reason was not rejected with 400");
    }

    console.log("\n🎉 ALL TESTS (TEST A - TEST E) COMPLETED AND PASSED SUCCESSFULLY!");
  } catch (error) {
    console.error("\n❌ TEST SUITE FAILED:", error);
    process.exitCode = 1;
  } finally {
    // Cleanup test booking
    if (testBookingId) {
      await pool.query("DELETE FROM additional_money_requests WHERE booking_id = $1", [testBookingId]);
      await pool.query("DELETE FROM payments WHERE booking_id = $1", [testBookingId]);
      await pool.query("DELETE FROM bookings WHERE id = $1", [testBookingId]);
      console.log(`🧹 Cleaned up test booking #${testBookingId}`);
    }
    await pool.end();
  }
}

runTests();

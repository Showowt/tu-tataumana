/**
 * Admin Payment Verification API
 * TU. by Tata Umana — WellnessOS v1.0
 *
 * POST /api/admin/payments/verify
 * Verifies a manual payment: marks transaction as approved,
 * creates the pack, and notifies the student.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdmin } from "@/lib/admin-auth";
import { getPackDefinition, calculateExpiration } from "@/lib/constants/packs";
import { notifyNewMembership, notifyPaymentReceived } from "@/lib/telegram";
import { ADMIN_EMAILS } from "@/lib/constants/business-rules";

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const VerifySchema = z.object({
  transaction_id: z.string().uuid("Invalid transaction ID"),
  payment_reference: z.string().optional(),
});

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (admin.role === "manager") {
    return NextResponse.json({ error: "Solo admins pueden verificar pagos" }, { status: 403 });
  }

  const supabase = admin.supabase;

  // Parse and validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = VerifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { transaction_id, payment_reference } = parsed.data;

  // -----------------------------------------------------------------------
  // 1. Get transaction and verify status is pending
  // -----------------------------------------------------------------------
  const { data: transaction, error: txError } = await supabase
    .from("tu_transactions")
    .select("*")
    .eq("id", transaction_id)
    .single();

  if (txError || !transaction) {
    console.error("[admin/payments/verify] Transaction not found:", txError?.message);
    return NextResponse.json(
      { error: "Transaction not found" },
      { status: 404 },
    );
  }

  if (transaction.status !== "pending") {
    return NextResponse.json(
      { error: `Transaction is already '${transaction.status}', cannot verify` },
      { status: 400 },
    );
  }

  // -----------------------------------------------------------------------
  // 2. Update transaction status to approved
  // -----------------------------------------------------------------------
  const updatePayload: Record<string, unknown> = {
    status: "approved",
  };

  if (payment_reference) {
    updatePayload.wompi_reference = payment_reference;
  }

  // Atomic guard: only transition pending→approved. If a concurrent verify (or a
  // webhook retry) already approved it, 0 rows update and we bail — preventing the
  // check-then-write race that would otherwise create a second pack below.
  const { data: updatedTx, error: updateError } = await supabase
    .from("tu_transactions")
    .update(updatePayload)
    .eq("id", transaction_id)
    .eq("status", "pending")
    .select("id");

  if (updateError) {
    console.error("[admin/payments/verify] Update failed:", updateError.message);
    return NextResponse.json(
      { error: "Failed to update transaction" },
      { status: 500 },
    );
  }

  if (!updatedTx || updatedTx.length === 0) {
    return NextResponse.json({
      data: { transaction_id, status: "approved" },
      error: null,
      message: "Transaction already verified",
    });
  }

  // -----------------------------------------------------------------------
  // 3. Get or create student from transaction metadata
  // -----------------------------------------------------------------------
  let studentId: string | null = transaction.student_id as string | null;
  let studentName = "Unknown";
  let studentEmail = "";

  if (studentId) {
    // Student already linked to transaction
    const { data: existingStudent } = await supabase
      .from("tu_students")
      .select("id, full_name, email")
      .eq("id", studentId)
      .single();

    if (existingStudent) {
      studentName = existingStudent.full_name || "Unknown";
      studentEmail = existingStudent.email || "";
    }
  } else {
    // Try to find/create student from metadata
    const metadata = transaction.metadata as Record<string, unknown> | null;
    const email = (metadata?.customer_email as string) || "";
    const name = (metadata?.customer_name as string) || "Unknown";

    if (email) {
      // Try to find existing student
      const { data: existingStudent } = await supabase
        .from("tu_students")
        .select("id, full_name, email")
        .eq("email", email.toLowerCase())
        .single();

      if (existingStudent) {
        studentId = existingStudent.id;
        studentName = existingStudent.full_name || name;
        studentEmail = existingStudent.email || email;
      } else {
        // Create new student
        const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());
        const { data: newStudent, error: studentErr } = await supabase
          .from("tu_students")
          .insert({
            email: email.toLowerCase(),
            full_name: name,
            role: isAdmin ? "admin" : "student",
            preferred_lang: "es",
          })
          .select("id, full_name, email")
          .single();

        if (studentErr) {
          console.error("[admin/payments/verify] Student creation failed:", studentErr.message);
        } else if (newStudent) {
          studentId = newStudent.id;
          studentName = newStudent.full_name || name;
          studentEmail = newStudent.email || email;
        }
      }

      // Link student to transaction
      if (studentId) {
        await supabase
          .from("tu_transactions")
          .update({ student_id: studentId })
          .eq("id", transaction_id);
      }
    }
  }

  // -----------------------------------------------------------------------
  // 4. Create pack if pack type is specified
  // -----------------------------------------------------------------------
  const packType = (transaction.related_pack_type as string) || null;

  if (packType && studentId) {
    const packDef = getPackDefinition(packType);

    if (packDef) {
      // Prevent duplicate pack creation
      const txId = (transaction.wompi_id as string) || transaction_id;
      const { data: existingPack } = await supabase
        .from("tu_packs")
        .select("id")
        .eq("student_id", studentId)
        .eq("wompi_transaction_id", txId)
        .single();

      if (existingPack) {
        return NextResponse.json({
          data: { transaction_id, status: "approved", student_id: studentId, pack_type: packType },
          error: null,
          message: "Payment verified (pack already existed)",
        });
      }

      const { error: packErr } = await supabase.from("tu_packs").insert({
        student_id: studentId,
        pack_type: packType,
        total_classes: packDef.totalClasses,
        classes_used: 0,
        price_paid: transaction.amount as number,
        currency: (transaction.currency as string) || "COP",
        status: "active",
        expires_at: calculateExpiration(packDef.expirationDays).toISOString(),
        payment_method: (transaction.payment_method as string) || "manual",
        wompi_transaction_id: txId,
        verified_by: admin.id !== "header-admin" ? admin.id : null,
        verified_at: new Date().toISOString(),
      });

      if (packErr) {
        console.error("[admin/payments/verify] Pack creation failed:", packErr.message);
        // Don't fail the whole request — transaction is already approved
      } else {
        // ---------------------------------------------------------------
        // 5. Notify via Telegram
        // ---------------------------------------------------------------
        try {
          await notifyNewMembership({
            studentName,
            email: studentEmail,
            packType: packDef.name.en,
            totalClasses: packDef.totalClasses,
            paymentMethod: (transaction.payment_method as string) || "manual",
          });
        } catch (notifyErr) {
          console.error("[admin/payments/verify] Membership notification failed:", notifyErr);
        }
      }
    } else {
      console.error("[admin/payments/verify] Unknown pack type:", packType);
    }
  }

  // Also send a payment-received notification
  try {
    await notifyPaymentReceived({
      reference: (transaction.wompi_reference as string) || transaction_id,
      amount: (transaction.amount as number) * 100, // notifyPaymentReceived divides by 100
      currency: (transaction.currency as string) || "COP",
      customerEmail: studentEmail || undefined,
      customerName: studentName || undefined,
      status: "APPROVED",
    });
  } catch {
    // Non-critical — don't fail the request
  }

  return NextResponse.json({
    data: {
      transaction_id,
      status: "approved",
      student_id: studentId,
      pack_type: packType,
    },
    error: null,
    message: "Payment verified and pack activated",
  });
}

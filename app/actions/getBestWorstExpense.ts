"use server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

async function getBestWorstExpense(): Promise<{
  bestExpense?: number;
  worstExpense?: number;
  error?: string;
}> {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return { error: "User not found" };
  }

  try {
    // First get the database user
    const user = await db.user.findUnique({
      where: {
        clerkUserId,
      },
    });

    if (!user) {
      return { error: "User not found in database" };
    }

    // Fetch all records for the authenticated user
    const records = await db.record.findMany({
      where: { userId: user.id },
      select: { amount: true }, // Fetch only the `amount` field for efficiency
    });

    if (!records || records.length === 0) {
      return { bestExpense: 0, worstExpense: 0 }; // Return 0 if no records exist
    }

    const amounts = records.map((record) => record.amount);

    // Calculate best and worst expense amounts
    const bestExpense = Math.max(...amounts); // Highest amount
    const worstExpense = Math.min(...amounts); // Lowest amount

    return { bestExpense, worstExpense };
  } catch (error) {
    console.error("Error fetching expense amounts:", error); // Log the error
    return { error: "Database error" };
  }
}

export default getBestWorstExpense;

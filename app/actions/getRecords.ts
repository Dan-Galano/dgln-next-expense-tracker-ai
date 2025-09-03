"use server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { Record } from "@/types/Record";

const getRecords = async (): Promise<{
  records?: Record[];
  error?: string;
}> => {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return { error: "User not authenticated" };
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

    // Then get the records using the database user.id
    const records = await db.record.findMany({
      where: {
        userId: user.id, // Use the database User.id here
      },
      orderBy: {
        date: "desc",
      },
      take: 10, // Limit request to 10 records
    });

    return { records };
  } catch (error) {
    console.error("Error fetching records:", error);
    return { error: "Database error" };
  }
};

export default getRecords;

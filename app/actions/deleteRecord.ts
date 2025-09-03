'use server';
import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

async function deleteRecord(recordId: string): Promise<{
  message?: string;
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

    await db.record.delete({
      where: {
        id: recordId,
        userId: user.id,
      },
    });

    revalidatePath('/');

    return { message: 'Record deleted' };
  } catch (error) {
    console.error('Error deleting record:', error); // Log the error
    return { error: 'Database error' };
  }
}

export default deleteRecord;
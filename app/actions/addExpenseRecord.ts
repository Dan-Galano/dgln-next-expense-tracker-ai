'use server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

interface RecordData {
  text: string;
  amount: number;
  category: string;
  date: string;
}

interface RecordResult {
  data?: RecordData;
  error?: string;
}

async function addExpenseRecord(formData: FormData): Promise<RecordResult> {
  const textValue = formData.get('text');
  const amountValue = formData.get('amount');
  const categoryValue = formData.get('category');
  const dateValue = formData.get('date');

  // Check for input values
  if (
    !textValue ||
    textValue === '' ||
    !amountValue ||
    !categoryValue ||
    categoryValue === '' ||
    !dateValue ||
    dateValue === ''
  ) {
    return { error: 'Text, amount, category, or date is missing' };
  }

  const text: string = textValue.toString();
  const amount: number = parseFloat(amountValue.toString());
  const category: string = categoryValue.toString();

  // Convert date to ISO-8601 format while preserving the user's input date
  let date: string;
  try {
    const inputDate = dateValue.toString();
    const [year, month, day] = inputDate.split('-');
    const dateObj = new Date(
      Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0)
    );
    date = dateObj.toISOString();
  } catch (error) {
    console.error('Invalid date format:', error);
    return { error: 'Invalid date format' };
  }

  // Get logged in user from Clerk
  const { userId: clerkUserId } = await auth();

  // Check for user
  if (!clerkUserId) {
    return { error: 'User not authenticated' };
  }

  try {
    // First, find or create the user in your database
    let user = await db.user.findUnique({
      where: { clerkUserId }
    });

    if (!user) {
      // User doesn't exist, get their data from Clerk and create them
      const clerkUser = await currentUser();
      
      if (!clerkUser) {
        return { error: 'Unable to get user details from Clerk' };
      }

      // Create user with Clerk data
      user = await db.user.create({
        data: {
          clerkUserId,
          email: clerkUser.emailAddresses[0]?.emailAddress || `${clerkUserId}@temp.com`,
          name: clerkUser.fullName || clerkUser.firstName || 'User',
          imageUrl: clerkUser.imageUrl,
        }
      });
    }

    // Create a new record using the database user's ID (not Clerk's user ID)
    const createdRecord = await db.record.create({
      data: {
        text,
        amount,
        category,
        date: new Date(date), // Convert back to Date object for Prisma
        userId: user.id, // Use the database user.id, not clerkUserId
      },
    });

    const recordData: RecordData = {
      text: createdRecord.text,
      amount: createdRecord.amount,
      category: createdRecord.category,
      date: createdRecord.date?.toISOString() || date,
    };

    revalidatePath('/');
    return { data: recordData };
    
  } catch (error) {
    console.error('Error adding expense record:', error);
    
    // Handle specific Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      if ((error as any).code === 'P2003') {
        return { error: 'Database user reference error. Please try logging out and back in.' };
      }
      if ((error as any).code === 'P2002') {
        return { error: 'Duplicate record detected.' };
      }
    }
    
    return {
      error: 'An unexpected error occurred while adding the expense record.',
    };
  }
}

export default addExpenseRecord;
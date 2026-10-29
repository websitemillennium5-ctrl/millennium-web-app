/** A classmate whose birthday is today, as returned by the `birthdays_today()` database function (migration 0019). */
export type BirthdayStudent = {
  id: string;
  full_name: string;
  course_slug: string | null;
  batch: string | null;
  student_id: string | null;
};

/**
 * Whether a date of birth (YYYY-MM-DD) falls on today's India date (YYYY-MM-DD).
 * Leap-day birthdays are celebrated on 28 Feb in years without a 29th.
 */
export function isBirthdayToday(dateOfBirth: string | null | undefined, today: string) {
  if (!dateOfBirth) return false;
  const birthday = dateOfBirth.slice(5, 10);
  const day = today.slice(5, 10);
  if (birthday === day) return true;
  if (birthday !== "02-29" || day !== "02-28") return false;
  const year = Number(today.slice(0, 4));
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return !leap;
}

export const firstName = (fullName: string) => fullName.trim().split(/\s+/)[0] || "there";

/** Who signs the birthday post on the notices page. */
export const BIRTHDAY_FROM = { name: "Manish", role: "Founder" };

/** The birthday post's wording, written as a note from the founder and the team (same text in the mobile app). */
export function birthdayNote(fullName: string) {
  const name = firstName(fullName);
  return {
    title: `Happy birthday, ${name}! 🎂`,
    body:
      `Dear ${name}, on behalf of everyone at Millennium Air Hostess Academy, I wish you a very happy birthday. ` +
      `May this year bring you new heights, confident interviews and the wings you are working so hard for. ` +
      `Enjoy your day. We are proud to have you with us.`,
    signature: `${BIRTHDAY_FROM.name}, ${BIRTHDAY_FROM.role}, and the Millennium team`,
  };
}

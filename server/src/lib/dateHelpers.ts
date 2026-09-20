// Returns the first and last moment of a given month
export const monthRange = (month: number, year: number) => ({
  start: new Date(year, month - 1, 1),
  end:   new Date(year, month, 0, 23, 59, 59, 999),
});

// How many days are in a month
export const daysInMonth = (month: number, year: number) =>
  new Date(year, month, 0).getDate();

// How many days have passed so far in the current month (min 1 to avoid /0)
export const daysPassed = (month: number, year: number) => {
  const today = new Date();
  if (today.getMonth() + 1 === month && today.getFullYear() === year) {
    return Math.max(today.getDate(), 1);
  }
  return daysInMonth(month, year); // past month — all days passed
};

// Days remaining in the month (min 1)
export const daysRemaining = (month: number, year: number) => {
  const total   = daysInMonth(month, year);
  const passed  = daysPassed(month, year);
  return Math.max(total - passed, 1);
};

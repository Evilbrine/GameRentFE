/**
 * Usuwa z obiektu wszystkie pola o wartości null lub undefined
 */
export function cleanPayload<T extends object>(obj: T): Partial<T> {
  const result: Partial<T> = {};

  for (const key of Object.keys(obj) as Array<keyof T>) {
    const value = obj[key];
    if (value !== null && value !== undefined) {
      result[key] = value;
    }
  }

  return result;
}
/** "9876543210" → "98xxxxxx10" (staff views; the owner sees full numbers). */
export const maskPhone = (phone: string) => (phone.length === 10 ? `${phone.slice(0, 2)}xxxxxx${phone.slice(-2)}` : phone);

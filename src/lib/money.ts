/** Money is stored in paise. These helpers keep conversions in one place. */
export const toPaise = (rupees: number) => Math.round(rupees * 100);
export const toRupees = (paise: number) => paise / 100;

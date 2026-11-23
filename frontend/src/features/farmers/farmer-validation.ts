export function isValidThaiNationalId(value: string) {
  if (!/^\d{13}$/.test(value)) return false;
  const sum = [...value.slice(0, 12)].reduce(
    (total, digit, index) => total + Number(digit) * (13 - index),
    0,
  );
  return Number(value[12]) === (11 - (sum % 11)) % 10;
}

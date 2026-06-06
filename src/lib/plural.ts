/**
 * Russian plural form selection.
 * Picks the correct word form for a count, handling the teens (11–14)
 * and compound-number rules that simple `< 5` checks get wrong.
 *
 * @example pluralizeRu(1, ['позиция', 'позиции', 'позиций']) // 'позиция'
 * @example pluralizeRu(3, ['позиция', 'позиции', 'позиций']) // 'позиции'
 * @example pluralizeRu(5, ['позиция', 'позиции', 'позиций']) // 'позиций'
 * @example pluralizeRu(12, ['позиция', 'позиции', 'позиций']) // 'позиций'
 */
export function pluralizeRu(
  count: number,
  forms: [one: string, few: string, many: string]
): string {
  const n = Math.abs(count) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return forms[2];
  if (n1 > 1 && n1 < 5) return forms[1];
  if (n1 === 1) return forms[0];
  return forms[2];
}

export const POSITION_FORMS: [string, string, string] = ['позиция', 'позиции', 'позиций'];

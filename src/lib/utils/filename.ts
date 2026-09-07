/**
 * Suggest an image name based on the Excel filename.
 * Matches common garment types to standardized image names.
 */
export function suggestImageName(fileName: string): string {
  const patterns: [RegExp, string][] = [
    [/blazer|coat|jacket|suit|waistcoat/i, 'men_blazer'],
    [/formal.*shirt/i, 'men_formal_shirts'],
    [/polo|tshirt|t-shirt|cardigan|sweater|hoodie/i, 'men_polo_shirt'],
    [/pyjama|cord.set/i, 'men_pyjama_set'],
    [/knit.*pant|short|swimshort|jogger/i, 'men_knit_pants_shorts'],
    [/woven|denim|chino|jean|trouser/i, 'men_chinos_trouser'],
  ];
  for (const [regex, name] of patterns) {
    if (regex.test(fileName)) return name;
  }
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 30);
}

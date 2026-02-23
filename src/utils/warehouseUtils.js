/**
 * Agent 2 & Agent 4: Warehouse Logic
 * Pallet codes: AA to ZZ
 * Levels: 1 to 10
 */

export function generateStockCodes(lastCode, count) {
  let [currentPallet, currentLevel] = lastCode ? lastCode.split('-') : ['AA', '0'];
  let level = parseInt(currentLevel, 10);
  
  const codes = [];
  
  for (let i = 0; i < count; i++) {
    level++;
    if (level > 10) {
      level = 1;
      currentPallet = nextPalletCode(currentPallet);
    }
    codes.push(`${currentPallet}-${level}`);
  }
  
  return codes;
}

function nextPalletCode(code) {
  // Simple base-26 style increment for AA, AB... ZZ
  let char1 = code.charCodeAt(0);
  let char2 = code.charCodeAt(1);
  
  char2++;
  if (char2 > 90) { // 'Z'
    char2 = 65; // 'A'
    char1++;
    if (char1 > 90) char1 = 65; // Reset to A if ZZ reached (unlikely for demo)
  }
  
  return String.fromCharCode(char1, char2);
}

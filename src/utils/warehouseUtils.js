/**
 * Agent 4: Warehouse Logic - Lot-Based Clustering
 * Each lot starts its own stack for better traceability and easier physical fetching.
 */
export function generateStockCodes(lastCode, count, isNewLot = true) {
  let [currentPallet, currentLevel] = lastCode ? lastCode.split('-') : ['AA', '0'];
  
  // The Boss Directive: If it's a new lot, move to the next palette 
  // to avoid physical mixing of different coffees.
  if (isNewLot && lastCode) {
    currentPallet = nextPalletCode(currentPallet);
    currentLevel = '0';
  }

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
  const chars = code.split('').map(c => c.charCodeAt(0));
  // Increment from right to left (ZZ style)
  for (let i = chars.length - 1; i >= 0; i--) {
    chars[i]++;
    if (chars[i] <= 90) break; // 'Z'
    chars[i] = 65; // Reset to 'A' and carry over to the next character
  }
  return String.fromCharCode(...chars);
}
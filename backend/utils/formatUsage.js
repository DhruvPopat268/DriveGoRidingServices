const formatUsage = (usage, categoryName, subcategoryName, subSubcategoryName) => {
  if (!usage) return usage;

  const normalizeString = (str) => str?.toLowerCase().replace(/[\s-]/g, '') || '';
  
  // Check if service is distance-based
  const isDistanceBased = normalizeString(subcategoryName).includes('oneway') || 
                         normalizeString(subSubcategoryName).includes('oneway') ||
                         normalizeString(categoryName).includes('parcel');

  console.log(`🔍 formatUsage - Service Type: ${isDistanceBased ? 'Distance-Based' : 'Time-Based'}`);
  console.log(`📝 formatUsage - Input: "${usage}"`);

  // Extract both Km and Minutes from usage string
  const kmMatch = usage.match(/(\d+)\s*km/i);
  const minsMatch = usage.match(/(\d+)\s*mins?/i);
  
  let result = '';
  
  if (isDistanceBased) {
    // Distance-based: show Km first, then formatted Minutes
    if (kmMatch && parseInt(kmMatch[1]) > 0) {
      const kmValue = parseInt(kmMatch[1]);
      result += `${kmValue} ${kmValue > 1 ? 'Kms' : 'Km'}`;
    }
    
    if (minsMatch && parseInt(minsMatch[1]) > 0) {
      const formattedTime = formatMinutes(parseInt(minsMatch[1]));
      result += result ? ` & ${formattedTime}` : formattedTime;
    }
  } else {
    // Time-based: show formatted Minutes first, then Km
    if (minsMatch && parseInt(minsMatch[1]) > 0) {
      result += formatMinutes(parseInt(minsMatch[1]));
    }
    
    if (kmMatch && parseInt(kmMatch[1]) > 0) {
      const kmValue = parseInt(kmMatch[1]);
      const kmText = `${kmValue} ${kmValue > 1 ? 'Kms' : 'Km'}`;
      result += result ? ` & ${kmText}` : kmText;
    }
  }
  
  const finalResult = result || usage;
  console.log(`✅ formatUsage - Output: "${finalResult}"`);
  
  return finalResult;
};

const formatMinutes = (mins) => {
  // Convert to days if >= 1440 minutes (24 hours)
  if (mins >= 1440) {
    const days = Math.floor(mins / 1440);
    const remainingMins = mins % 1440;
    const hours = Math.floor(remainingMins / 60);
    const minutes = remainingMins % 60;

    let result = `${days} Day${days > 1 ? 's' : ''}`;
    if (hours > 0) {
      result += ` ${hours} Hour${hours > 1 ? 's' : ''}`;
    }
    if (minutes > 0) {
      result += ` ${minutes} Minute${minutes > 1 ? 's' : ''}`;
    }
    return result;
  }

  // Convert to hours if >= 60 minutes
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;

    let result = `${hours} Hour${hours > 1 ? 's' : ''}`;
    if (minutes > 0) {
      result += ` ${minutes} Minute${minutes > 1 ? 's' : ''}`;
    }
    return result;
  }

  // Less than 60 minutes - return as minutes
  return `${mins} Minute${mins > 1 ? 's' : ''}`;
};

module.exports = { formatUsage };
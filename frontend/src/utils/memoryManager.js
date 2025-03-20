// Memory management utility functions

// Regular expressions for memory operations
const MEMORY_PATTERNS = {
  STORE: /(?:remember|store|save|note) (?:that )?(?:my |the )?(\w+(?:\s+\w+)*)\s*(?:is|=)\s*([^.!?]+)/i,
  RECALL: /(?:what(?:'s| is| was)?|tell me|do you know|do you remember) (?:my |the )?(\w+(?:\s+\w+)*)(?:\s+(?:is|was|that) I\s+(?:mentioned|said|gave|provided|told you|shared))?/i,
  FORGET: /(?:forget|clear|remove|delete) (?:my |the )?(\w+(?:\s+\w+)*)/i,
  UPDATE: /(?:update|change|modify) (?:my |the )?(\w+(?:\s+\w+)*)\s*(?:to|with|as)\s*([^.!?]+)/i
};

export const processMemoryOperation = (message, currentMemory) => {
  console.log("Processing message for memory operations:", message);
  
  // Check for store operation
  const storeMatch = message.match(MEMORY_PATTERNS.STORE);
  if (storeMatch) {
    console.log("Store match:", storeMatch);
    const [, key, value] = storeMatch;
    return {
      operation: 'store',
      key: key.toLowerCase().trim(),
      value: value.trim(),
      response: `I've noted the **${key}**: "${value.trim()}", and I'll remember it for our conversation.`
    };
  }

  // Check for recall operation
  const recallMatch = message.match(MEMORY_PATTERNS.RECALL);
  if (recallMatch) {
    console.log("Recall match:", recallMatch);
    const [, key] = recallMatch;
    const cleanKey = key.toLowerCase().trim();
    const value = currentMemory[cleanKey];
    return {
      operation: 'recall',
      key: cleanKey,
      response: value 
        ? `The **${key}** is "${value}".`
        : `I don't have any **${key}** stored from our conversation. Could you provide it again?`
    };
  }

  // Check for forget operation
  const forgetMatch = message.match(MEMORY_PATTERNS.FORGET);
  if (forgetMatch) {
    console.log("Forget match:", forgetMatch);
    const [, key] = forgetMatch;
    return {
      operation: 'forget',
      key: key.toLowerCase().trim(),
      response: `I've forgotten the **${key}**.`
    };
  }

  // Check for update operation
  const updateMatch = message.match(MEMORY_PATTERNS.UPDATE);
  if (updateMatch) {
    console.log("Update match:", updateMatch);
    const [, key, value] = updateMatch;
    return {
      operation: 'update',
      key: key.toLowerCase().trim(),
      value: value.trim(),
      response: `I've updated the **${key}** to "${value.trim()}".`
    };
  }

  console.log("No memory operations found");
  return null;
};

export const updateMemory = (operation, currentMemory) => {
  if (!operation) return currentMemory;

  const { operation: op, key, value } = operation;
  const newMemory = { ...currentMemory };

  switch (op) {
    case 'store':
    case 'update':
      newMemory[key] = value;
      break;
    case 'forget':
      delete newMemory[key];
      break;
    default:
      break;
  }

  return newMemory;
};

export const formatMemoryResponse = (operation, currentMemory) => {
  if (!operation) return null;

  const { operation: op, key, value } = operation;
  let response = operation.response;

  // Add context to responses
  if (op === 'store' && currentMemory[key]) {
    response = `I've updated the **${key}** from "${currentMemory[key]}" to "${value}".`;
  }

  return response;
}; 
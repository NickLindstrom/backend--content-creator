function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function deepMerge(target, patch) {
  if (Array.isArray(patch)) {
    return patch.map((item) => deepMerge(undefined, item));
  }

  if (!isPlainObject(patch)) {
    return patch;
  }

  const source = isPlainObject(target) ? target : {};
  const result = { ...source };

  for (const [key, value] of Object.entries(patch)) {
    result[key] = deepMerge(source[key], value);
  }

  return result;
}

module.exports = {
  deepMerge
};

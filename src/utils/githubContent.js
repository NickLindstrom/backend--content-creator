function encodeJsonContent(value) {
  const json = JSON.stringify(value, null, 2) + "\n";
  return Buffer.from(json, "utf8").toString("base64");
}

function encodeBase64Content(value) {
  return value.replace(/^data:[^;]+;base64,/, "").replace(/\s+/g, "");
}

function decodeJsonContent(encoded) {
  const raw = Buffer.from(encoded, "base64").toString("utf8");
  return JSON.parse(raw);
}

module.exports = {
  encodeJsonContent,
  encodeBase64Content,
  decodeJsonContent
};

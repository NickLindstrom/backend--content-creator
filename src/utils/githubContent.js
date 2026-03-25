function encodeJsonContent(value) {
  const json = JSON.stringify(value, null, 2) + "\n";
  return Buffer.from(json, "utf8").toString("base64");
}

function decodeJsonContent(encoded) {
  const raw = Buffer.from(encoded, "base64").toString("utf8");
  return JSON.parse(raw);
}

module.exports = {
  encodeJsonContent,
  decodeJsonContent
};

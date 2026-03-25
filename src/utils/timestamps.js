function isoDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

module.exports = {
  isoDate
};

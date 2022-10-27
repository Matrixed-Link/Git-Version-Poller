function ts(level) {
    const timestamp = new Date().toISOString();
    return timestamp + ` [${level}]`;
}
exports.ts = ts;

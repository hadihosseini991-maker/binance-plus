// utils/mongodb.js
const mongoose = require('mongoose');

let cached = global._mongoCached;
if (!cached) {
  cached = global._mongoCached = { conn: null, promise: null };
}

async function connectToDatabase(uri) {
  if (cached.conn) {
    return cached.conn;
  }
  if (!cached.promise) {
    const opts = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    };
    cached.promise = mongoose.connect(uri, opts).then(m => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = connectToDatabase;

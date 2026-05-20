import mongoose from 'mongoose';

function normalizeMongoUri(uri) {
  if (!uri?.startsWith('mongodb+srv://')) return uri;

  try {
    const url = new URL(uri);
    if (url.pathname && url.pathname !== '/') return uri;

    url.pathname = '/stocksync';
    if (!url.searchParams.has('retryWrites')) {
      url.searchParams.set('retryWrites', 'true');
    }
    if (!url.searchParams.has('w')) {
      url.searchParams.set('w', 'majority');
    }
    return url.toString();
  } catch {
    return uri;
  }
}

const connectDB = async () => {
  const uri = normalizeMongoUri(
    process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/stocksync'
  );

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  });

  console.log(`MongoDB connected: ${mongoose.connection.host}`);
};

export default connectDB;

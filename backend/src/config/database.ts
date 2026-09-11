import mongoose from 'mongoose';
import config from './index';

/**
 * Connect to MongoDB database
 */
export const connectDatabase = async (): Promise<typeof mongoose> => {
  try {
    const options: mongoose.ConnectOptions = {
      dbName: config.mongo.dbName,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      autoIndex: !config.isProduction
    };

    const conn = await mongoose.connect(config.mongo.uri, options);
    console.log(`✅ [MongoDB] Connected successfully to host: ${conn.connection.host}, database: ${config.mongo.dbName}`);

    // Event listeners
    mongoose.connection.on('error', (err) => {
      console.error('❌ [MongoDB] Connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  [MongoDB] Disconnected from database');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ [MongoDB] Reconnected to database');
    });

    return conn;
  } catch (error) {
    console.error('❌ [MongoDB] Connection failed with fatal error:', error);
    process.exit(1);
  }
};

/**
 * Disconnect from MongoDB database gracefully
 */
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    console.log('✅ [MongoDB] Connection closed gracefully');
  } catch (error) {
    console.error('❌ [MongoDB] Error closing database connection:', error);
  }
};

/**
 * Check MongoDB Connection Status
 */
export const getDatabaseStatus = (): { status: string; isConnected: boolean; readyState: number } => {
  const readyState = mongoose.connection.readyState;
  const states: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  return {
    status: states[readyState] || 'unknown',
    isConnected: readyState === 1,
    readyState
  };
};

export default connectDatabase;

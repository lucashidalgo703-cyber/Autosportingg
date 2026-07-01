import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';

dotenv.config();

const mongoCache = globalThis.__autosportingMongoCache || {
    connection: null,
    promise: null,
    dnsConfigured: false
};

globalThis.__autosportingMongoCache = mongoCache;

const configureDnsOnce = () => {
    if (mongoCache.dnsConfigured) return;

    const servers = (process.env.MONGODB_DNS_SERVERS || '')
        .split(',')
        .map((server) => server.trim())
        .filter(Boolean);

    if (servers.length > 0) {
        dns.setServers(servers);
    }

    mongoCache.dnsConfigured = true;
};

export default async function connectDB() {
    if (!process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI is not configured');
    }

    if (mongoose.connection.readyState === 1) {
        mongoCache.connection = mongoose.connection;
        return mongoCache.connection;
    }

    if (mongoCache.connection && mongoCache.connection.readyState !== 1) {
        mongoCache.connection = null;
        mongoCache.promise = null;
    }

    try {
        configureDnsOnce();
        mongoose.set('bufferCommands', false);
        mongoose.set('autoIndex', false);

        if (!mongoCache.promise) {
            mongoCache.promise = mongoose.connect(process.env.MONGODB_URI, {
                serverSelectionTimeoutMS: 15000,
                socketTimeoutMS: 45000,
                maxPoolSize: 10,
                minPoolSize: 1,
                maxIdleTimeMS: 10000, // Previene usar conexiones muertas tras el freeze de Vercel
                family: 4             // Fuerza IPv4, soluciona SSL alert 80 en MongoDB Atlas
            }).then((mongooseInstance) => {
                mongoCache.connection = mongooseInstance.connection;
                console.log(`MongoDB Connected: ${mongoCache.connection.host}`);
                return mongoCache.connection;
            });
        }

        return await mongoCache.promise;
    } catch (error) {
        mongoCache.connection = null;
        mongoCache.promise = null;
        console.error(`Error connecting to MongoDB: ${error.message}`);
        throw error;
    }
}

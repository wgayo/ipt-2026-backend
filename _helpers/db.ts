import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { Sequelize } from 'sequelize';
import accountModel from '../accounts/account.model';
import refreshTokenModel from '../accounts/refresh-token.model';

const db: any = {};
export default db;

type FileConfig = {
    database?: {
        host?: string;
        port?: number;
        user?: string;
        password?: string;
        database?: string;
    };
};

function loadFileConfig(): FileConfig {
    try {
        const configPath = path.resolve(__dirname, '..', 'config.json');
        const raw = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

const fileConfig: FileConfig = process.env.NODE_ENV === 'production' ? {} : loadFileConfig();

function getDatabaseConfig() {
    const databaseConfig = fileConfig.database || {};

    const host = process.env.DB_HOST || databaseConfig.host;
    const port = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : (databaseConfig.port || 3306);
    const user = process.env.DB_USER || databaseConfig.user;
    const password = process.env.DB_PASSWORD || databaseConfig.password;
    const database = process.env.DB_NAME || databaseConfig.database;
    const ssl = process.env.DB_SSL === 'true';

    if (!host || !user || !password || !database) {
        throw new Error('Database configuration is missing. Set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME.');
    }

    return { host, port, user, password, database, ssl };
}

async function initialize() {
    const { host, port, user, password, database, ssl } = getDatabaseConfig();

    if (process.env.NODE_ENV !== 'production' && host === 'localhost') {
        const connection = await mysql.createConnection({ host, port, user, password });
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
    }

    const sequelize = new Sequelize(database, user, password, {
        host,
        port,
        dialect: 'mysql',
        dialectOptions: ssl ? { ssl: { rejectUnauthorized: false } } : undefined
    });

    db.Account = accountModel(sequelize);
    db.RefreshToken = refreshTokenModel(sequelize);

    db.Account.hasMany(db.RefreshToken, { onDelete: 'CASCADE' });
    db.RefreshToken.belongsTo(db.Account);

    await sequelize.sync();
}

initialize();

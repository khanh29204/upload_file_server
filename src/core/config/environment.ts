import { config } from 'dotenv';
config();

export const environment = {
  domain: process.env.DOMAIN,
  port: process.env.PORT || 3000,
  databaseUrl: process.env.DATABASE_URL,
  jwt_secret: process.env.JWT_SECRET,
  key_register: process.env.KEY_REGISTER,
  serverDir: process.env.SERVER_DIR,
  createSymlink: process.env.CREATE_SYMLINK === 'true',
  useSubDir: process.env.USE_SUB_DIR === 'true',
  cors: process.env.CORS,
};

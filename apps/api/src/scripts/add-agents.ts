import mongoose from 'mongoose';
import { loadEnv } from '../config/env';
import { UserModel } from '../models/user.model';
import bcrypt from 'bcryptjs';
import { UserRole } from '@pente/shared';

const run = async () => {
  const env = loadEnv();
  await mongoose.connect(env.MONGODB_URI);
  const passwordHash = await bcrypt.hash('PenteDemo123!', 12);
  await UserModel.bulkWrite([
    {
      updateOne: {
        filter: { email: 'alice@pente.ai' },
        update: {
          name: 'Alice Agent',
          email: 'alice@pente.ai',
          passwordHash,
          role: UserRole.Agent,
          active: true,
        },
        upsert: true,
      },
    },
    {
      updateOne: {
        filter: { email: 'dave@pente.ai' },
        update: {
          name: 'Dave Agent',
          email: 'dave@pente.ai',
          passwordHash,
          role: UserRole.Agent,
          active: true,
        },
        upsert: true,
      },
    },
  ]);
  console.log('Added Alice and Dave agents.');
  await mongoose.disconnect();
};

run().catch(console.error);

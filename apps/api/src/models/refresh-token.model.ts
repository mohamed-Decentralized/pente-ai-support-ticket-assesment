import { Schema, model } from 'mongoose';

const refreshTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    familyId: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true, expires: 0 },
    revokedAt: { type: Date },
    replacedByHash: { type: String },
  },
  { timestamps: true },
);

export const RefreshTokenModel = model('RefreshToken', refreshTokenSchema);

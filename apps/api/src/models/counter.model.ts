import { Schema, model } from 'mongoose';

const counterSchema = new Schema({
  _id: { type: String, required: true },
  sequence: { type: Number, required: true, default: 1000 },
});

export const CounterModel = model('Counter', counterSchema);

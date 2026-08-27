import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ collection: 'tickets', strict: false, timestamps: true })
export class Ticket {
  @Prop({ type: String, required: true })
  ticketNumber!: string;

  @Prop({ type: String, required: true })
  status!: string;

  @Prop({ type: String, required: true })
  priority!: string;

  @Prop({ type: String })
  assignedTo?: string;

  @Prop({ type: Date, required: true })
  slaDueAt!: Date;

  @Prop({ type: Date })
  createdAt!: Date;

  @Prop({ type: Date })
  resolvedAt?: Date;
}

export type TicketDocument = HydratedDocument<Ticket>;
export const TicketSchema = SchemaFactory.createForClass(Ticket);

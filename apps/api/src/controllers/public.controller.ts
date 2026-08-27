import { Request, Response } from 'express';
import { TicketService } from '../services/ticket.service';

export class PublicController {
  constructor(private readonly service: TicketService) {}

  createPublic = async (req: Request, res: Response) => {
    const ticket = await this.service.createPublic(req.body);
    res.status(201).json(ticket);
  };

  lookupPublic = async (req: Request, res: Response) => {
    res.json(await this.service.lookupPublic(req.body.email, req.body.page, req.body.limit));
  };

  getPublic = async (req: Request, res: Response) => {
    res.json(await this.service.getPublic(String(req.params.ticketNumber), req.body.email));
  };

  customerReply = async (req: Request, res: Response) => {
    res
      .status(201)
      .json(
        await this.service.customerReply(
          String(req.params.ticketNumber),
          req.body.email,
          req.body.message,
        ),
      );
  };
}

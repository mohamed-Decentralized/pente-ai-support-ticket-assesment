import { Request, Response } from 'express';
import { ticketListQuerySchema } from '@pente/shared';
import { TicketService } from '../services/ticket.service';

export class TicketController {
  constructor(private readonly service: TicketService) {}

  dashboard = async (req: Request, res: Response) => {
    res.json(await this.service.dashboard(req.user!));
  };

  listStaff = async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(String(req.query.page)) || 1);
    const limit = Math.max(1, parseInt(String(req.query.limit)) || 10);
    res.json(await this.service.listStaff(page, limit));
  };

  getAuditLog = async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(String(req.query.page)) || 1);
    const limit = Math.max(1, parseInt(String(req.query.limit)) || 10);
    res.json(
      await this.service.getAuditLog(String(req.params.ticketNumber), page, limit, req.user!),
    );
  };

  list = async (req: Request, res: Response) => {
    res.json(await this.service.list(ticketListQuerySchema.parse(req.query), req.user!));
  };

  get = async (req: Request, res: Response) => {
    res.json(await this.service.get(String(req.params.ticketNumber), req.user!));
  };

  changeStatus = async (req: Request, res: Response) => {
    res.json(
      await this.service.changeStatus(String(req.params.ticketNumber), req.body.status, req.user!),
    );
  };

  assign = async (req: Request, res: Response) => {
    res.json(
      await this.service.assign(String(req.params.ticketNumber), req.body.assignedTo, req.user!),
    );
  };

  changePriority = async (req: Request, res: Response) => {
    res.json(
      await this.service.changePriority(
        String(req.params.ticketNumber),
        req.body.priority,
        req.user!,
      ),
    );
  };

  staffReply = async (req: Request, res: Response) => {
    res
      .status(201)
      .json(
        await this.service.staffReply(String(req.params.ticketNumber), req.body.message, req.user!),
      );
  };

  summarize = async (req: Request, res: Response) => {
    res.json(await this.service.summarize(String(req.params.ticketNumber), req.user!));
  };

  generateTriage = async (req: Request, res: Response) => {
    res.json(await this.service.generateTriage(String(req.params.ticketNumber)));
  };

  reviewTriage = async (req: Request, res: Response) => {
    res.json(
      await this.service.reviewTriage(
        String(req.params.ticketNumber),
        req.body.accepted,
        req.body.priority,
        req.user!,
      ),
    );
  };

  delete = async (req: Request, res: Response) => {
    res.json(await this.service.delete(String(req.params.ticketNumber), req.user!));
  };
}

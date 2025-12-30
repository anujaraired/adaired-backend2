import { Types } from "mongoose";

export interface TicketAttachment {
  url: string;
  publicId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: Date;
}

export interface TicketMessage {
  _id: Types.ObjectId;
  sender: Types.ObjectId;
  message: string;
  attachments: TicketAttachment[];
  readBy: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export enum TicketStatus {
  OPEN = "open",
  IN_PROGRESS = "in progress",
  RESOLVED = "resolved",
  CLOSED = "closed",
  REOPENED = "reopened"
}

export enum TicketPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent"
}

export interface TicketMetadata {
  createdBy: "customer" | "support" | "admin";
  createdForCustomer: boolean;
  supportCreatedAsCustomer?: boolean;
}

export interface Ticket {
  _id: Types.ObjectId;
  ticketId: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdBy: Types.ObjectId;
  assignedTo?: Types.ObjectId;
  customer?: Types.ObjectId;
  messages: TicketMessage[];
  participants?: Types.ObjectId[];
  metadata: TicketMetadata;
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
  closedBy?: Types.ObjectId;
}

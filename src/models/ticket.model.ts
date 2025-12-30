import mongoose, { Model, Schema } from "mongoose";
import { Ticket, TicketStatus, TicketPriority } from "../types/ticket.types";

const TicketAttachmentSchema = new Schema({
  url: { type: String, required: true },
  publicId: { type: String, required: true },
  fileName: { type: String, required: true },
  fileType: { type: String, required: true },
  fileSize: { type: Number, required: true },
  uploadedAt: { type: Date, default: Date.now },
});

const TicketMessageSchema = new Schema(
  {
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true },
    attachments: [TicketAttachmentSchema],
    readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

const TicketSchema = new Schema<Ticket>(
  {
    ticketId: { type: String, unique: true },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(TicketStatus),
      default: TicketStatus.OPEN,
    },
    priority: {
      type: String,
      enum: Object.values(TicketPriority),
      default: TicketPriority.MEDIUM,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    customer: { type: Schema.Types.ObjectId, ref: "User" },
    messages: [TicketMessageSchema],
    metadata: {
      createdBy: {
        type: String,
        enum: ["customer", "support", "admin"],
        required: true,
      },
      createdForCustomer: { type: Boolean, required: true },
      supportCreatedAsCustomer: { type: Boolean },
    },
    closedAt: { type: Date },
    closedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Add static method to generate ticket ID
TicketSchema.statics.generateTicketId = async function () {
  const prefix = "ADTKT-";
  // Find the highest existing ticketId
  const lastTicket = await this.findOne({}, { ticketId: 1 })
    .sort({ ticketId: -1 })
    .lean();

  let nextNum = 1;
  if (lastTicket?.ticketId) {
    const lastNum = parseInt(lastTicket.ticketId.replace(prefix, ""), 10);
    if (!isNaN(lastNum)) {
      nextNum = lastNum + 1;
    }
  }

  return `${prefix}${nextNum.toString().padStart(2, "0")}`;
};

// Pre-save hook to set ticketId
TicketSchema.pre("save", async function (next) {
  if (!this.isNew || this.ticketId) return next();

  try {
    this.ticketId = await (this.constructor as any).generateTicketId();
    next();
  } catch (err: any) {
    next(err);
  }
});

// Indexes
TicketSchema.index({ status: 1 });
TicketSchema.index({ priority: 1 });
TicketSchema.index({ createdBy: 1 });
TicketSchema.index({ assignedTo: 1 });
TicketSchema.index({ customer: 1 });
TicketSchema.index({ "metadata.createdBy": 1 });
TicketSchema.index({ "metadata.createdForCustomer": 1 });

const TicketModel: Model<Ticket> = mongoose.model<Ticket>(
  "Ticket",
  TicketSchema
);

export default TicketModel;

import { Server, Socket } from "socket.io";
   import jwt from "jsonwebtoken";
   import http from "http";
   import { RateLimiterMemory } from "rate-limiter-flexible";
   import TicketModel from "../models/ticket.model";
   import { CustomError } from "../middlewares/error";
   import { checkPermission, getUserRoleType } from "../helpers/authHelper";
   import { Types } from "mongoose";
import { TicketMessage, TicketPriority, TicketStatus } from "../types/ticket.types";

   // Rate limiter for WebSocket messages
   const rateLimiter = new RateLimiterMemory({
     points: 10, // 10 messages
     duration: 60, // per minute
   });

   // Interface for Socket with user data
   interface AuthenticatedSocket extends Socket {
     userId?: string;
   }

   // Initialize WebSocket server
   export const initializeWebSocket = (server: http.Server) => {
     const io = new Server(server, {
       cors: {
         origin: process.env.ALLOWED_ORIGINS?.split(",") || [
           "https://rwf4p3bf-3000.inc1.devtunnels.ms",
           "https://dashboard-adaired.vercel.app",
           "https://ad-admin-five.vercel.app",
           "https://www.adaired.com",
           "https://adaired.com",
           "http://localhost:3000",
           "http://localhost:3001",
           "http://localhost:3002",
           "http://localhost:3003",
           "http://localhost:3004",
         ],
         credentials: true,
       },
     });

     // Middleware for JWT authentication
     io.use(async (socket: AuthenticatedSocket, next) => {
       try {
         const token = socket.handshake.auth.token?.split(" ")[1];
         if (!token) throw new CustomError(401, "Authentication token missing");

         const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
         socket.userId = decoded.userId;

         // Validate user exists
         const userType = await getUserRoleType(decoded.userId);
         if (!userType) throw new CustomError(401, "Invalid user");

         next();
       } catch (error) {
         next(new CustomError(401, "Authentication failed"));
       }
     });

     // Connection handler
     io.on("connection", (socket: AuthenticatedSocket) => {
       console.log(`User ${socket.userId} connected`);

       // Join ticket room
       socket.on("joinTicket", async ({ ticketId }: { ticketId: string }) => {
         try {
           // Validate ticket access
           const hasAccess = await validateTicketAccess(socket.userId!, ticketId);
           if (!hasAccess) {
             socket.emit("error", { message: "Access denied to this ticket" });
             return;
           }

           socket.join(ticketId);
           socket.emit("joinedTicket", { ticketId });
           console.log(`User ${socket.userId} joined ticket ${ticketId}`);
         } catch (error) {
           socket.emit("error", { message: (error as Error).message });
         }
       });

       // Handle new message
       socket.on("sendMessage", async ({ ticketId, message, attachments }: { ticketId: string; message: string; attachments?: any[] }) => {
         try {
           // Rate limiting
           await rateLimiter.consume(socket.userId!);

           // Validate input
           if (!message.trim()) throw new CustomError(400, "Message cannot be empty");

           // Validate ticket access
           const hasAccess = await validateTicketAccess(socket.userId!, ticketId);
           if (!hasAccess) throw new CustomError(403, "Access denied");

           // Save message to database
           const ticket = await TicketModel.findById(ticketId);
           if (!ticket) throw new CustomError(404, "Ticket not found");

           const newMessage = {
             sender: new Types.ObjectId(socket.userId!),
             message,
             attachments: attachments || [],
             readBy: [new Types.ObjectId(socket.userId!)],
           };

           ticket.messages.push(newMessage as TicketMessage);
           await ticket.save();

           // Broadcast message to ticket room
           io.to(ticketId).emit("newMessage", {
             ticketId,
             message: newMessage,
           });
         } catch (error) {
           socket.emit("error", { message: (error as Error).message });
         }
       });

       // Handle typing indicator
       socket.on("typing", ({ ticketId }: { ticketId: string }) => {
         socket.to(ticketId).emit("userTyping", { userId: socket.userId, ticketId });
       });

       // Handle stop typing
       socket.on("stopTyping", ({ ticketId }: { ticketId: string }) => {
         socket.to(ticketId).emit("userStoppedTyping", { userId: socket.userId, ticketId });
       });

       // Handle message read
       socket.on("readMessage", async ({ ticketId, messageId }: { ticketId: string; messageId: string }) => {
         try {
           const ticket = await TicketModel.findById(ticketId);
           if (!ticket) throw new CustomError(404, "Ticket not found");

           const message = ticket.messages.find((msg) => msg._id.toString() === messageId);
           if (!message) throw new CustomError(404, "Message not found");

           if (!message.readBy.some((id) => id.equals(new Types.ObjectId(socket.userId!)))) {
             message.readBy.push(new Types.ObjectId(socket.userId!));
             await ticket.save();
           }

           io.to(ticketId).emit("messageRead", { ticketId, messageId, userId: socket.userId });
         } catch (error) {
           socket.emit("error", { message: (error as Error).message });
         }
       });

       // Handle ticket updates (status, priority, assignment)
       socket.on("updateTicket", async ({ ticketId, updates }: { ticketId: string; updates: { status?: string; priority?: string; assignedTo?: string } }) => {
         try {
           const ticket = await TicketModel.findById(ticketId);
           if (!ticket) throw new CustomError(404, "Ticket not found");

           const hasUpdatePermission = await checkPermission(socket.userId!, "tickets", 2);
           const isAdmin = (await getUserRoleType(socket.userId!)) === "admin";
           if (!hasUpdatePermission && !isAdmin) throw new CustomError(403, "No permission to update ticket");

           if (updates.status) ticket.status = updates.status as TicketStatus;
           if (updates.priority) ticket.priority = updates.priority as TicketPriority;
           if (updates.assignedTo) ticket.assignedTo = new Types.ObjectId(updates.assignedTo);

           await ticket.save();

           io.to(ticketId).emit("ticketUpdated", { ticketId, updates });
         } catch (error) {
           socket.emit("error", { message: (error as Error).message });
         }
       });

       // Handle disconnection
       socket.on("disconnect", () => {
         console.log(`User ${socket.userId} disconnected`);
       });
     });
   };

   // Validate ticket access
   async function validateTicketAccess(userId: string, ticketId: string): Promise<boolean> {
     const ticket = await TicketModel.findById(ticketId);
     if (!ticket) return false;

     const userType = await getUserRoleType(userId);
     const isAdmin = userType === "admin";
     const hasTicketAccess = await checkPermission(userId, "tickets", 1);
     const isCustomer = ticket.customer?.equals(userId);
     const isAssigned = ticket.assignedTo?.equals(userId);

     return isAdmin || hasTicketAccess || isCustomer || isAssigned;
   }
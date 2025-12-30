import { Request, Response, NextFunction } from "express";
import TicketModel from "../models/ticket.model";
import { CustomError } from "../middlewares/error";
import {
  uploadTicketAttachments,
  deleteTicketAttachments,
} from "../utils/cloudinary";
import { TicketStatus, TicketPriority } from "../types/ticket.types";
import { checkPermission, getUserRoleType } from "../helpers/authHelper";
import User from "../models/user.model";
import { validateInput } from "../utils/validateInput";

// Shared permission validator
const validateTicketPermissions = async (
  userId: string,
  ticketId: string,
  action: "update" | "message" | "close" | "delete"
) => {
  const ticket = await TicketModel.findById(ticketId);
  if (!ticket) throw new CustomError(404, "Ticket not found");

  const userType = await getUserRoleType(userId);
  const isAdmin = userType === "admin";
  const hasUpdatePermission = await checkPermission(userId, "tickets", 2);
  const isAssigned = ticket.assignedTo?.equals(userId);
  const isCustomer = ticket.customer.equals(userId);

  // Permission matrix
  const permissions = {
    update: isAdmin || hasUpdatePermission,
    message: isAdmin || hasUpdatePermission || isAssigned || isCustomer,
    close: isAdmin || hasUpdatePermission,
    delete: isAdmin || (await checkPermission(userId, "tickets", 3)),
  };

  if (!permissions[action]) {
    const errorMessages = {
      update: "Only admin or users with update permission can modify tickets",
      message:
        "Only admin, users with update permission, or assigned agent can message tickets",
      close: "Only admin or users with update permission can close tickets",
      delete: "Only admin or users with delete permission can remove tickets",
    };
    throw new CustomError(403, errorMessages[action]);
  }

  return { ticket, isAdmin, hasUpdatePermission, isAssigned, isCustomer };
};

// *********************************************************
// ******************* Create New Ticket *******************
// *********************************************************
export const createTicket = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate user input
    if (!validateInput(req, res)) return;

    const { userId, body, files } = req;
    const { subject, status, description, priority, customer, assignedTo } =
      body;

    const user = await User.findById(userId).populate("role");
    if (!user) throw new CustomError(404, "User not found");

    // Determine user type
    const userType = await getUserRoleType(userId);
    const isCustomer = userType === "customer";
    const isAdmin = userType === "admin";

    // ALL users can create tickets, but with different rules:

    // 1. Customers can only create tickets for themselves
    if (isCustomer) {
      if (customer && customer !== userId) {
        throw new CustomError(
          403,
          "Customers cannot create tickets for others"
        );
      }
      if (assignedTo) {
        throw new CustomError(403, "Customers cannot assign tickets");
      }
    }

    // 2. Support users without create permission create as customers
    const hasTicketCreatePermission = await checkPermission(
      userId,
      "tickets",
      0
    );
    const isSupportCreatingAsCustomer =
      userType === "support" && !hasTicketCreatePermission;

    if (isSupportCreatingAsCustomer) {
      if (customer || assignedTo) {
        throw new CustomError(
          403,
          "Support without create permission must create ticket as customers"
        );
      }
    }

    // 3. Support users with create permission can specify customers/assignees
    if (userType === "support" && hasTicketCreatePermission) {
      if (customer && customer !== userId) {
        const canCreateForOthers = await checkPermission(userId, "tickets", 4);
        if (!canCreateForOthers) {
          throw new CustomError(
            403,
            "You don't have permission to create tickets for others"
          );
        }
      }
    }

    // Handle attachments
    const attachments =
      files && Array.isArray(files) ? await uploadTicketAttachments(files) : [];

    // Determine assignment and customer
    let finalAssignedTo = assignedTo;
    let finalCustomer = customer || userId;

    // Auto-assignment rules:
    if (isCustomer || isSupportCreatingAsCustomer) {
      // Customer tickets or support creating as customer -> assign to admin
      const defaultAdmin = await User.findOne({ isAdmin: true }).sort({
        createdAt: 1,
      });
      if (!defaultAdmin)
        throw new CustomError(404, "No admin available for assignment");
      finalAssignedTo = defaultAdmin._id;
    } else if (!assignedTo) {
      // Default to creator if no assignment specified
      finalAssignedTo = userId;
    }

    const newTicket = await TicketModel.create({
      subject,
      description,
      status: status || TicketStatus.OPEN,
      priority: priority || TicketPriority.MEDIUM,
      createdBy: userId,
      assignedTo: finalAssignedTo,
      customer: finalCustomer,
      messages: [
        {
          sender: userId,
          message: description,
          attachments,
        },
      ],
      metadata: {
        createdBy: isSupportCreatingAsCustomer ? "customer" : userType,
        createdForCustomer: !!customer && customer !== userId,
        supportCreatedAsCustomer: isSupportCreatingAsCustomer,
      },
    });

    const populatedTicket = await TicketModel.findById(newTicket._id)
      .populate("createdBy", "image name email")
      .populate("assignedTo", "image name email")
      .populate("customer", "image name email");

    res.status(201).json({
      success: true,
      message: "Ticket created successfully",
      data: populatedTicket,
    });
  } catch (error: any) {
    if (error.code === 11000 && error.keyPattern?.ticketId) {
      // Handle duplicate ticketId error by retrying
      return createTicket(req, res, next);
    }
    next(new CustomError(500, error.message));
  }
};

// *********************************************************
// ********************** Read Tickets *********************
// *********************************************************
export const getTickets = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req;
    const {
      id,
      status,
      priority,
      assignedTo,
      customer,
      ticketId,
      page,
      limit,
    } = req.query;

    // Permission check
    const hasReadPermission = await checkPermission(userId, "tickets", 1).catch(
      () => false
    );
    const userType = await getUserRoleType(userId);
    const isAdmin = userType === "admin";

    const filter: Record<string, any> = {};

    // Customers and end support users can only see their own tickets or tickets assigned to them
    if (!hasReadPermission && !isAdmin) {
      filter.$or = [
        { createdBy: userId },
        { customer: userId },
        { assignedTo: userId },
      ];
    }

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (customer) filter.customer = customer;
    if (ticketId) filter.ticketId = ticketId;
    if (id) filter._id = id;

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    const limitNumber = Number(limit);

    // Fetch data
    const [tickets, total] = await Promise.all([
      TicketModel.find(filter)
        .populate("createdBy", "image name email")
        .populate("assignedTo", "image name email")
        .populate("customer", "image name email")
        .populate("messages.sender", "image name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber),
      TicketModel.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      message: "Tickets fetched successfully",
      data: tickets,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    next(new CustomError(500, error.message || "Failed to fetch tickets"));
  }
};

// *********************************************************
// ********************* Ticket Stats **********************
// *********************************************************
export const getTicketStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req;

    // Get user type and basic permissions
    const userType = await getUserRoleType(userId);
    const isAdmin = userType === "admin";
    const isSupport = userType === "support";
    const isCustomer = userType === "customer";
    const hasStatsPermission = await checkPermission(userId, "tickets", 1);

    // Common base for all responses
    const response: any = {
      success: true,
      data: {
        role: userType,
        stats: {
          // Will be populated below
        },
      },
    };

    if (isAdmin || hasStatsPermission) {
      // Admin/Manager Stats
      const [total, open, resolved, closed, assignedToMe] = await Promise.all([
        TicketModel.countDocuments(),
        TicketModel.countDocuments({ status: TicketStatus.OPEN }),
        TicketModel.countDocuments({ status: TicketStatus.RESOLVED }),
        TicketModel.countDocuments({ status: TicketStatus.CLOSED }),
        TicketModel.countDocuments({ assignedTo: userId }),
      ]);

      response.data.stats = {
        total,
        open,
        closed,
        resolved,
        assignedToMe,
      };
    } else if (isSupport) {
      // Support Agent Stats
      const [assigned, pending, delivered] = await Promise.all([
        TicketModel.countDocuments({ assignedTo: userId }),
        TicketModel.countDocuments({
          assignedTo: userId,
          status: { $ne: "closed" },
        }),
        TicketModel.countDocuments({
          assignedTo: userId,
          status: "closed",
        }),
      ]);

      const efficiency =
        assigned > 0 ? Math.round((delivered / assigned) * 100) : 0;

      response.data.stats = {
        total: assigned,
        open: pending,
        closed: delivered,
        efficiency,
      };
    } else if (isCustomer) {
      // Customer Stats
      const [total, open, closed, reopened] = await Promise.all([
        TicketModel.countDocuments({ customer: userId }),
        TicketModel.countDocuments({
          customer: userId,
          status: TicketStatus.OPEN,
        }),
        TicketModel.countDocuments({
          customer: userId,
          status: TicketStatus.CLOSED,
        }),
        TicketModel.countDocuments({
          customer: userId,
          status: TicketStatus.REOPENED,
        }),
      ]);

      response.data.stats = {
        total,
        open,
        closed,
        reopened,
      };
    } else {
      throw new CustomError(
        403,
        "You don't have permission to view statistics"
      );
    }

    res.status(200).json(response);
  } catch (error: any) {
    next(new CustomError(500, error.message));
  }
};
// *********************************************************
// ********************* Update Ticket *********************
// *********************************************************
export const updateTicket = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!validateInput(req, res)) return;

    const { userId, body, files } = req;
    const { id } = req.query;
    const { message, status, priority, assignedTo } = body;

    // Validate permissions based on action type
    const action =
      status === TicketStatus.CLOSED ? "close" : message ? "message" : "update";

    const { isAdmin, isAssigned, isCustomer, hasUpdatePermission } =
      await validateTicketPermissions(userId, id as string, action);

    const updates: any = {};
    const updateOperations: any = {};

    // Handle status changes (including closing)
    if (status) {
      if (!isAdmin && !hasUpdatePermission) {
        throw new CustomError(
          403,
          "Only admin or support with update permission can change status"
        );
      }
      updates.status = status;
      if (status === TicketStatus.CLOSED) {
        updates.closedAt = new Date();
        updates.closedBy = userId;
      }
    }

    // Handle field updates (only for admin/support with permission)
    if (priority || assignedTo) {
      if (!isAdmin && !hasUpdatePermission) {
        throw new CustomError(
          403,
          "Only admin or support with update permission can modify ticket fields"
        );
      }
      if (priority) updates.priority = priority;
      if (assignedTo) updates.assignedTo = assignedTo;
    }

    // Handle message additions (allowed for assigned support even without update permission)
    if (message) {
      // Use validator's returned values
      if (!isAdmin && !hasUpdatePermission && !isAssigned && !isCustomer) {
        throw new CustomError(
          403,
          "Only ticket participants can message this ticket"
        );
      }
      const attachments =
        files && Array.isArray(files)
          ? await uploadTicketAttachments(files)
          : [];

      updateOperations.$push = {
        messages: {
          sender: userId,
          message,
          attachments,
        },
      };
    }

    // Apply updates
    if (Object.keys(updates).length > 0) {
      updateOperations.$set = updates;
    }

    const updatedTicket = await TicketModel.findByIdAndUpdate(
      id,
      updateOperations,
      { new: true }
    )
      .populate("createdBy", "image name email")
      .populate("assignedTo", "image name email")
      .populate("customer", "image name email")
      .populate("messages.sender", "image name email");

    res.status(200).json({
      success: true,
      message: "Ticket updated successfully",
      data: updatedTicket,
    });
  } catch (error: any) {
    next(new CustomError(500, error.message));
  }
};

// *********************************************************
// ********************* Delete Ticket *********************
// *********************************************************
export const deleteTicket = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req;
    const { id } = req.query;

    // Validate delete permission
    const { ticket } = await validateTicketPermissions(
      userId,
      id as string,
      "delete"
    );

    // Delete attachments from Cloudinary
    const attachmentPublicIds = ticket.messages.flatMap((msg) =>
      msg.attachments.map((att) => att.publicId)
    );
    if (attachmentPublicIds.length > 0) {
      await deleteTicketAttachments(attachmentPublicIds);
    }

    await TicketModel.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Ticket deleted successfully",
    });
  } catch (error: any) {
    next(new CustomError(500, error.message));
  }
};

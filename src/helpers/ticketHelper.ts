import { CustomError } from "../middlewares/error";
import TicketModel from "../models/ticket.model";
import { getUserRoleType, checkPermission } from "./authHelper";

export const validateTicketPermissions = async (
  userId: string,
  ticketId: string,
  action: "update" | "close" | "message"
): Promise<{
  isAdmin: boolean;
  isAssigned: boolean;
  isCustomer: boolean;
  hasUpdatePermission: boolean;
}> => {
  const ticket = await TicketModel.findById(ticketId);
  if (!ticket) {
    throw new CustomError(404, "Ticket not found");
  }

  const userType = await getUserRoleType(userId);
  const isAdmin = userType === "admin";
  const isCustomer = userType === "customer";
  const isAssigned = ticket.assignedTo?.toString() === userId;
  const hasUpdatePermission = await checkPermission(userId, "tickets", 2).catch(
    () => false
  );

  if (action === "update" || action === "close") {
    if (!isAdmin && !isAssigned && !hasUpdatePermission) {
      throw new CustomError(
        403,
        "You don't have permission to perform this action"
      );
    }
  } else if (action === "message") {
    const isParticipant = ticket.participants.some(
      (p) => p.toString() === userId
    );
    if (!isAdmin && !isAssigned && !isCustomer && !isParticipant) {
      throw new CustomError(
        403,
        "You don't have permission to message in this ticket"
      );
    }
  }

  return {
    isAdmin,
    isAssigned,
    isCustomer,
    hasUpdatePermission,
  };
};
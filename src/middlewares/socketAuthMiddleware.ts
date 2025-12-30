import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { CustomError } from "./error";

export const verifySocketToken = async (socket: Socket, next: (err?: Error) => void) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      throw new CustomError(401, "No token provided");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { _id: string };
    socket.data.userId = decoded._id;
    next();
  } catch (error) {
    next(new CustomError(401, "Invalid or expired token"));
  }
};
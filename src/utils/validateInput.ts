import { Request, Response } from "express";
import { validationResult } from "express-validator";

export const validateInput = (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      message: errors.array()[0].msg,
      errors: errors.array(),
    });
    return false;
  }
  return true;
};

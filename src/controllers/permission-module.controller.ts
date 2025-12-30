import { Request, Response, NextFunction } from "express";
import Permission_Module from "../models/permission-modules.model";
import { checkPermission } from "../helpers/authHelper";
import { CustomError } from "../middlewares/error";
import { validateInput } from "../utils/validateInput";

// ***************************************
// ********** Create Module **************
// ***************************************
const createModule = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, body } = req;

    if (!(await checkPermission(userId, "Permission_Modules", 0)))
      throw new CustomError(403, "Permission denied");

    if (!validateInput(req, res)) return;

    const createdModule = await Permission_Module.create(body);
    res.status(201).json({
      message: "Module created successfully",
      data: createdModule,
    });
  } catch (error: any) {
    next(new CustomError(500, error.message));
  }
};

// ***************************************
// ********** Find Modules ***************
// ***************************************
const findModules = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req;
    const { identifier } = req.query;

    let modules;
    if (identifier) {
      const idString = identifier.toString();
      if (idString.match(/^[0-9a-fA-F]{24}$/)) {
        modules = await Permission_Module.findById(identifier).lean();
      } else {
        modules = await Permission_Module.findOne({ name: identifier }).lean();
      }
    } else {
      modules = await Permission_Module.find().lean();
    }
    res.status(200).json({
      message: "Modules fetched successfully",
      data: modules,
    });
  } catch (error: any) {
    next(new CustomError(500, error.message));
  }
};

// ***************************************
// ********** Update Module **************
// ***************************************
const updateModule = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req;
    const { id } = req.query;

    if (!(await checkPermission(userId, "Permission_Modules", 2)))
      throw new CustomError(403, "Permission denied");

    if (!validateInput(req, res)) return;

    const updatedModule = await Permission_Module.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
    );

    if (!updatedModule) throw new CustomError(404, "Module not found");

    res.status(200).json({
      message: "Module updated successfully",
      data: updatedModule,
    });
  } catch (error: any) {
    next(new CustomError(500, error.message));
  }
};

// ***************************************
// ********** Delete Module **************
// ***************************************
const deleteModule = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req;
    const { id } = req.query;

    if (!(await checkPermission(userId, "Permission_Modules", 3)))
      throw new CustomError(403, "Permission denied");

    const deletedModule = await Permission_Module.findByIdAndDelete(id);

    if (!deletedModule) throw new CustomError(404, "Module not found");

    res.status(200).json({
      message: "Module deleted successfully",
    });
  } catch (error: any) {
    next(new CustomError(500, error.message));
  }
};

export { createModule, findModules, updateModule, deleteModule };

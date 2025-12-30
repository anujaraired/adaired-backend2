import Service from "../models/serviceModel";
import { NextFunction, Request, Response } from "express";
import { CustomError } from "../middlewares/error";
import slugify from "slugify";
import {checkPermission} from "../helpers/authHelper";
import { validationResult } from "express-validator";
import { ServiceTypes } from "../types/serviceTypes";

// ********** Create Service **********

const createService = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, body } = req;
    const { slug, canonicalLink } = body;

    // Check Permission
    const permissionCheck = await checkPermission(userId, "services", 0);
    if (!permissionCheck) {
      return res.status(403).json({ message: "Permission denied" });
    }

    // Validate user input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Invalid input",
        errors: errors.array(),
      });
    }

    // Check if Slug is already in use
    const existingService = await Service.findOne({
      slug: slugify(slug, { lower: true }),
    });
    if (existingService) {
      throw new CustomError(400, "Service with this slug already exists");
    }

    // Save service
    const serviceData = {
      ...body,
      canonicalLink:
        "https://www.adaired.com/services/" +
        slugify(canonicalLink, { lower: true }),
      slug: slugify(slug, { lower: true }),
    };
    const service = await Service.create(serviceData);

    // Update Parent Service if created service is a child service
    if (body.parentService) {
      await Service.findByIdAndUpdate(
        body.parentService,
        {
          $push: {
            childServices: {
              childServiceId: service._id,
              childServiceName: service.serviceName,
              childServiceSlug: service.slug,
            },
          },
        },
        { new: true }
      );
    }

    res.status(201).json({
      message: "Service created successfully",
      data: service,
    });
  } catch (error) {
    next(error);
  }
};

// ********** Read Services **********

const readServices = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { identifier } = req.params;

  try {
    let service;

    if (identifier) {
      // Check if the identifier is a valid MongoDB ObjectId
      if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
        service = await Service.findById(identifier).lean();
      } else {
        service = await Service.findOne({ slug: identifier }).lean();
      }

      if (!service) {
        return next(new CustomError(404, "Service not found!"));
      }

      return res.status(200).json(service);
    } else {
      // If no identifier is provided, return all services
      const services = await Service.find().lean();
      return res.status(200).json(services);
    }
  } catch (error) {
    return next(error);
  }
};

// ********** Update Service **********

const updateService = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, body } = req;
    const { id } = req.params;

    // Check Permission
    const permissionCheck = await checkPermission(userId, "services", 2);
    if (!permissionCheck) {
      return res.status(403).json({ message: "Permission denied" });
    }

    // Validate user input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Invalid input",
        errors: errors.array(),
      });
    }

    // Check if Slug is already in use
    if (body.slug) {
      const existingService = await Service.findOne({
        slug: slugify(body.slug, { lower: true }),
        _id: { $ne: id }, // Exclude the current service from the check
      });
      if (existingService) {
        throw new CustomError(400, "Service with this slug already exists");
      }
    }

    // Prepare update data
    const updateData: any = {
      ...body,
      slug: body.slug ? slugify(body.slug, { lower: true }) : undefined,
      canonicalLink: body.canonicalLink
        ? "https://www.adaired.com/services/" +
          slugify(body.canonicalLink, { lower: true })
        : undefined,
    };

    // Remove undefined fields from updateData
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key]
    );

    // Find the current service
    const currentService = await Service.findById(id);
    if (!currentService) {
      return next(new CustomError(404, "Service not found!"));
    }

    // Update parent service if changed
    if (
      body.parentService &&
      body.parentService !== currentService.parentService
    ) {
      // Remove from old parent
      if (currentService.parentService) {
        await Service.findByIdAndUpdate(
          currentService.parentService,
          { $pull: { childServices: { childServiceId: id } } },
          { new: true }
        );
      }

      // Add to new parent
      await Service.findByIdAndUpdate(
        body.parentService,
        {
          $push: {
            childServices: {
              childServiceId: id,
              childServiceName: body.serviceName || currentService.serviceName,
              childServiceSlug: body.slug
                ? slugify(body.slug, { lower: true })
                : currentService.slug,
            },
          },
        },
        { new: true }
      );
    }

    // Update service
    const updatedService = await Service.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedService) {
      return next(new CustomError(404, "Service not found!"));
    }

    res.status(200).json({
      message: "Service updated successfully",
      data: updatedService,
    });
  } catch (error) {
    next(error);
  }
};

// ********** Delete Service **********

const deleteService = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req;
    const { id } = req.params;

    // Check Permission
    const permissionCheck = await checkPermission(userId, "services", 3);
    if (!permissionCheck) return;

    // Delete service
    const deletedService = await Service.findByIdAndDelete(id);

    // Remove service from parent's array
    if (deletedService.parentService) {
      const parentService = await Service.findByIdAndUpdate(
        deletedService.parentService,
        { $pull: { childServices: { childServiceId: id } } },
        { new: true }
      );
    }

    if (!deletedService) {
      return next(new CustomError(404, "Service not found!"));
    }

    res.status(200).json({
      message: "Service deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// ********** Duplicate Service **********

const duplicateService = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req;
    const { id } = req.params;

    // Check Permission
    const permissionCheck = await checkPermission(userId, "services", 1);
    if (!permissionCheck) {
      return res.status(403).json({ message: "Permission denied" });
    }

    // Find the existing service
    const existingService = await Service.findById(id);
    if (!existingService) {
      return next(new CustomError(404, "Service not found!"));
    }

    // Prepare new service data
    const duplicateData: ServiceTypes = {
      ...existingService.toObject(),
      _id: undefined,
      serviceName: `${existingService.serviceName}-copy`,
      slug: `${existingService.slug}-copy`,
      canonicalLink: `https://www.adaired.com/services/${slugify(
        `${existingService.serviceName}-copy`,
        { lower: true }
      )}`,
    };

    // Create the duplicate service
    const duplicatedService = await Service.create(duplicateData);

    // If the service has a parent, add to parent's child services
    if (existingService.parentService) {
      await Service.findByIdAndUpdate(
        existingService.parentService,
        {
          $push: {
            childServices: {
              childServiceId: duplicatedService._id,
              childServiceName: duplicatedService.serviceName,
              childServiceSlug: duplicatedService.slug,
            },
          },
        },
        { new: true }
      );
    }

    res.status(201).json({
      message: "Service duplicated successfully",
      data: duplicatedService,
    });
  } catch (error) {
    next(error);
  }
};

export {
  createService,
  readServices,
  updateService,
  deleteService,
  duplicateService,
};

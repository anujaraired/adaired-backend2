import { BASE_DOMAIN } from "../utils/globals";
import User from "../models/user.model";
import { NextFunction, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt, { JwtPayload, TokenExpiredError } from "jsonwebtoken";
import { CustomError } from "../middlewares/error";
import Cart from "../models/cartModel";
import { sendEmail } from "../utils/mailer";
import { validateInput } from "../utils/validateInput";
import Role from "../models/role.model";
import crypto from "crypto";

// Token generation utilities
const generateAccessToken = (userId: string): string =>
  jwt.sign({ _id: userId }, process.env.JWT_SECRET as string, {
    expiresIn: "1d",
  });

const generateRefreshToken = (userId: string): string =>
  jwt.sign({ _id: userId }, process.env.JWT_REFRESH_SECRET as string, {
    expiresIn: "30d",
  });

// Utility to generate random secure password
const generateRandomPassword = (): string => {
  return crypto.randomBytes(16).toString("hex");
};

// ***************************************
// ********** Register User **************
// ***************************************
const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { image, name, email, password, role, contact, status, googleId } =
      req.body;

    // Validate user input
    if (!validateInput(req, res)) return;

    // Check if required fields are present
    if (!name || !email) {
      throw new CustomError(400, "Name and Email are required");
    }

    // Check for existing user with lean for speed
    if (
      await User.findOne({
        $or: [{ email }, { userName: email.split("@")[0].toLowerCase() }],
      }).lean()
    ) {
      throw new CustomError(
        400,
        "User with this email or username already exists"
      );
    }

    // Handle password for Google and regular users
    let hashedPassword: string | undefined;
    let randomPassword: string | undefined;

    if (googleId) {
      // For Google users, generate a random secure password
      randomPassword = generateRandomPassword();
      hashedPassword = await bcrypt.hash(randomPassword, 10);
    } else if (password) {
      // For regular users, use provided password
      hashedPassword = await bcrypt.hash(password, 10);
    } else {
      throw new CustomError(400, "Password or Google ID required");
    }

    // Create user with all fields in one go
    const user = new User({
      name,
      email: email.toLowerCase(),
      userName: email.split("@")[0].toLowerCase(),
      ...(image && { image }),
      ...(hashedPassword && { password: hashedPassword }),
      ...(contact && { contact }),
      ...(status && { status }),
      ...(googleId && { googleId }),
      isVerifiedUser: googleId ? true : false,
    });

    // Set admin status for first user
    const userCount = await User.countDocuments();

    if (userCount === 0) {
      user.isAdmin = true;
      user.role = null;
    } else {
      // Assign role: Use provided role or default to "Customer"
      let assignedRoleId = role;
      if (!role) {
        const defaultRole = await Role.findOne({ name: "customer" }).lean();
        if (!defaultRole) {
          throw new CustomError(404, "Default Customer role not found");
        }
        assignedRoleId = defaultRole._id;
      }

      const roleDoc = await Role.findById(assignedRoleId);
      if (!roleDoc) {
        throw new CustomError(404, "Role not found");
      }
      user.role = roleDoc._id;
      roleDoc.users.push(user._id);
      await roleDoc.save();
    }

    // Create cart and assign in one operation
    const cart = new Cart({
      userId: user._id,
      products: [],
      totalQuantity: 0,
      totalPrice: 0,
    });
    user.cart = cart._id;

    // Generate tokens
    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());
    user.refreshToken = refreshToken;

    // Save user and cart in parallel
    await Promise.all([user.save(), cart.save()]);

    // Handle email sending based on registration type
    if (googleId && randomPassword) {
      // Send email with random password for Google users
      sendEmail(
        user.email,
        "Your Account Password",
        `<p>Hi ${user.name},</p><p>Your account has been created using Google authentication.</p><p>You can also login using your username or email with this password: <strong>${randomPassword}</strong></p><p>Please store this password securely.</p>`
      ).catch((err) => console.error("Email sending failed:", err));
    } else {
      // Send verification email for regular users
      sendVerificationEmail(user._id.toString()).catch((err) =>
        console.error("Email sending failed:", err)
      );
    }

    res.status(201).json({
      message: "User registered successfully",
      accessToken,
      refreshToken,
      user,
    });
  } catch (error: any) {
    next(new CustomError(500, error.message));
  }
};

// ***************************************
// ************* Login User **************
// ***************************************
// const login = async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const { identifier, password, googleId } = req.body;

//     // Validate user input
//     if (!validateInput(req, res)) return;

//     // Fetch user with password and lean for speed
//     let user;
//     if (googleId) {
//       // Google login
//       user = await User.findOne({ googleId }).select("+password").lean();
//       if (!user) {
//         throw new CustomError(400, "User with this Google ID does not exist.");
//       }
//     } else {
//       // Email/username login
//       if (!identifier || !password) {
//         throw new CustomError(400, "Identifier and password are required.");
//       }
//       user = await User.findOne({
//         $or: [{ email: identifier }, { userName: identifier }],
//       })
//         .select("+password")
//         .lean();

//       if (!user) {
//         throw new CustomError(
//           400,
//           "User with this email or username does not exist."
//         );
//       }

//       // Verify password
//       if (!user.password || !(await bcrypt.compare(password, user.password))) {
//         throw new CustomError(401, "Incorrect Password!");
//       }
//     }

//     // Generate tokens
//     const accessToken = generateAccessToken(user._id.toString());
//     const refreshToken =
//       user.refreshToken &&
//       jwt.verify(user.refreshToken, process.env.JWT_REFRESH_SECRET as string)
//         ? user.refreshToken
//         : generateRefreshToken(user._id.toString());

//     // Update refresh token if necessary (minimal DB write)
//     if (refreshToken !== user.refreshToken) {
//       await User.updateOne({ _id: user._id }, { refreshToken });
//     }

//     // Fetch user data with role in one query
//     const userData = await User.findById(user._id)
//       .populate("role", "name permissions")
//       .lean();

//     // Extract expiresAt from JWT
//     const decodedToken = jwt.decode(accessToken) as JwtPayload;
//     if (!decodedToken.exp) throw new Error("Token has no expiration");
//     const expiresAt = new Date(decodedToken.exp * 1000);

//     res.status(200).json({
//       message: "Login successful",
//       accessToken,
//       refreshToken,
//       user: userData,
//       expiresAt: expiresAt,
//     });
//   } catch (error) {
//     next(
//       error instanceof CustomError
//         ? error
//         : new CustomError(500, "Login failed")
//     );
//   }
// };

// const login = async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const { identifier, password, googleId } = req.body;

//     // Validate user input
//     if (!validateInput(req, res)) return;


//     // Fetch user with password and role
//     let user;
//     if (googleId) {
//       user = await User.findOne({ googleId })
//         .select("+password")
//         .populate("role", "name permissions")
//         .lean();
//       if (!user) {
//         throw new CustomError(400, "User with this Google ID does not exist.");
//       }
//     } else {
//       if (!identifier || !password) {
//         throw new CustomError(400, "Identifier and password are required.");
//       }
//       user = await User.findOne({
//         $or: [
//           { email: identifier.trim().toLowerCase() },
//           { userName: identifier.trim().toLowerCase() },
//         ],
//       })
//         .select("+password")
//         .populate("role", "name permissions")
//         .lean();

//       if (!user) {
//         throw new CustomError(
//           400,
//           "User with this email or username does not exist."
//         );
//       }

//       // Verify password
//       if (!user.password || !(await bcrypt.compare(password, user.password))) {
//         throw new CustomError(401, "Incorrect Password!");
//       }
//     }

//     // Generate tokens
//     const accessToken = generateAccessToken(user._id.toString());
//     let refreshToken = null;

//     if (user.refreshToken) {
//       try {
//         const verified = jwt.verify(
//           user.refreshToken,
//           process.env.JWT_REFRESH_SECRET as string
//         );
//         refreshToken = user.refreshToken;
//       } catch (error) {
//         console.error("jwt.verify error:", error);
//         refreshToken = generateRefreshToken(user._id.toString());
//       }
//     } else {
//       refreshToken = generateRefreshToken(user._id.toString());
//     }

//     // Update refresh token if necessary
//     if (refreshToken !== user.refreshToken) {
//       try {
//         await User.updateOne({ _id: user._id }, { refreshToken });
//       } catch (error) {
//         console.error("Failed to update refresh token:", error);
//         throw new CustomError(500, "Failed to update refresh token");
//       }
//     }

//     // Extract expiresAt from JWT
//     const decodedToken = jwt.decode(accessToken) as JwtPayload;
//     if (!decodedToken.exp) throw new Error("Token has no expiration");
//     const expiresAt = new Date(decodedToken.exp * 1000);

//     res.status(200).json({
//       message: "Login successful",
//       accessToken,
//       refreshToken,
//       user,
//       expiresAt,
//     });
//   } catch (error) {
//     console.error("Login error:", error);
//     next(
//       error instanceof CustomError
//         ? error
//         : new CustomError(500, "Login failed")
//     );
//   }
// };

// import jwt, { TokenExpiredError, JwtPayload } from "jsonwebtoken";

const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { identifier, password, googleId } = req.body;

    // Validate user input
    if (!validateInput(req, res)) return;

    // Fetch user with password and role
    let user;
    if (googleId) {
      user = await User.findOne({ googleId })
        .select("+password +refreshToken")
        .populate("role", "name permissions")
        .lean();
      if (!user) {
        throw new CustomError(400, "User with this Google ID does not exist.");
      }
    } else {
      if (!identifier || !password) {
        throw new CustomError(400, "Identifier and password are required.");
      }
      user = await User.findOne({
        $or: [
          { email: identifier.trim().toLowerCase() },
          { userName: identifier.trim().toLowerCase() },
        ],
      })
        .select("+password +refreshToken")
        .populate("role", "name permissions")
        .lean();

      if (!user) {
        throw new CustomError(
          400,
          "User with this email or username does not exist."
        );
      }

      // Verify password
      if (!user.password || !(await bcrypt.compare(password, user.password))) {
        throw new CustomError(401, "Incorrect Password!");
      }
    }

    // Generate access token
    const accessToken = generateAccessToken(user._id.toString());
    let refreshToken = user.refreshToken;

    // Handle refresh token validation
    const jwtSecret = process.env.JWT_REFRESH_SECRET as string;
    let refreshTokenValid = false;

    if (refreshToken) {
      try {
        jwt.verify(refreshToken, jwtSecret);
        refreshTokenValid = true;
      } catch (err) {
        if (err instanceof TokenExpiredError) {
          console.warn("Refresh token expired, generating a new one.");
        } else {
          console.warn("Invalid refresh token:", (err as Error).message);
        }
        // In both cases, generate a new one
        refreshToken = generateRefreshToken(user._id.toString());
      }
    } else {
      // If no token exists, create one
      refreshToken = generateRefreshToken(user._id.toString());
    }

    // Update refresh token in DB if changed
    if (!refreshTokenValid || refreshToken !== user.refreshToken) {
      try {
        await User.updateOne({ _id: user._id }, { refreshToken });
      } catch (err) {
        console.error("Failed to update refresh token:", err);
        throw new CustomError(500, "Failed to update refresh token");
      }
    }

    // Decode access token to extract expiry time
    const decodedToken = jwt.decode(accessToken) as JwtPayload;
    if (!decodedToken.exp) throw new Error("Token has no expiration");
    const expiresAt = new Date(decodedToken.exp * 1000);

    res.status(200).json({
      message: "Login successful",
      accessToken,
      refreshToken,
      user,
      expiresAt,
    });
  } catch (error) {
    console.error("Login error:", error);
    next(
      error instanceof CustomError
        ? error
        : new CustomError(500, "Login failed")
    );
  }
};

// ***************************************
// ********** Refresh Token **************
// ***************************************
const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new CustomError(401, "No token provided");
    }

    // Verify the refresh token
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET as string
    ) as JwtPayload;
    const user = await User.findById(decoded._id).select("refreshToken").lean();
    if (!user || user.refreshToken !== refreshToken) {
      throw new CustomError(401, "Invalid refresh token");
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(user._id.toString());
    const newRefreshToken = generateRefreshToken(user._id.toString());

    // Update refresh token in one operation
    await User.updateOne({ _id: user._id }, { refreshToken: newRefreshToken });

    res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    next(
      error instanceof CustomError
        ? error
        : new CustomError(500, "Token refresh failed")
    );
  }
};

// ***************************************
// ************ Logout User **************
// ***************************************
const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req;

    // Clear refresh token in one update
    await User.updateOne({ _id: userId }, { refreshToken: null });
    res.status(200).json({ message: "User logged out successfully" });
  } catch (error) {
    next(
      error instanceof CustomError
        ? error
        : new CustomError(500, "Logout failed")
    );
  }
};

// ***************************************
// ********** Forgot Password ************
// ***************************************
const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { identifier } = req.body;

    const user = await User.findOne({
      $or: [{ email: identifier }, { userName: identifier }],
    })
      .select("name email")
      .lean();
    if (!user) {
      throw new CustomError(404, "User not found");
    }

    const resetToken = jwt.sign(
      { email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: "10m" } // Token expires in 10 minutes
    );
    const resetLink = `${BASE_DOMAIN}/auth/reset-password?token=${resetToken}`;

    // Send email asynchronously
    sendEmail(
      user.email,
      "Password Reset",
      `<p>Hi ${user.name},</p><p>Please click the link below to reset your password:</p><a href="${resetLink}">Reset Password</a>`
    ).catch((err) => console.error("Email sending failed:", err));

    res.status(200).json({ message: "Password reset link sent successfully" });
  } catch (error) {
    next(
      error instanceof CustomError
        ? error
        : new CustomError(500, "Password reset failed")
    );
  }
};

// ***************************************
// ********** Reset Password *************
// ***************************************
const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req;
    const { currentPassword, newPassword, resetToken } = req.body;

    let user;
    if (userId) {
      // Logged-in user resetting password
      user = await User.findById(userId).select("+password");
      if (!user) throw new CustomError(404, "User not found");

      if (
        !currentPassword ||
        !(await bcrypt.compare(currentPassword, user.password))
      ) {
        throw new CustomError(400, "Current password is incorrect");
      }

      // Check if newPassword is the same as currentPassword
      if (await bcrypt.compare(newPassword, user.password)) {
        throw new CustomError(
          400,
          "New password cannot be the same as the current password"
        );
      }
    } else if (resetToken) {
      // Reset via token
      const decoded = jwt.verify(
        resetToken,
        process.env.JWT_SECRET as string
      ) as JwtPayload;
      user = await User.findOne({ email: decoded.email });
      if (!user) throw new CustomError(404, "User not found");
    } else {
      throw new CustomError(400, "Missing userId or resetToken");
    }

    // Hash new password
    user.password = await bcrypt.hash(newPassword, 10);
    user.refreshToken = null; // Invalidate refresh token
    await user.save();

    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    next(
      error instanceof CustomError
        ? error
        : new CustomError(500, "Password reset failed")
    );
  }
};

// ***************************************
// ****** Send Verification Email ********
// ***************************************
const sendVerificationEmail = async (userId: string): Promise<void> => {
  const user = await User.findById(userId)
    .select("name email isVerifiedUser")
    .lean();
  if (!user) throw new CustomError(404, "User not found");
  if (user.isVerifiedUser) throw new CustomError(400, "User already verified");

  const verificationToken = jwt.sign(
    { email: user.email },
    process.env.JWT_SECRET as string,
    {
      expiresIn: "10m",
    }
  );
  const verificationLink = `${BASE_DOMAIN}/auth/verify?token=${verificationToken}`;

  await sendEmail(
    user.email,
    "Verify Your Email",
    `<p>Hi ${user.name},</p><p>Please verify your email by clicking the link below:</p><a href="${verificationLink}">Verify Email</a><p>This link will expire in 10 minutes.</p>`
  );
};

// ***************************************
// *********** Verify Email **************
// ***************************************
const verifyUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.query;

    if (!token) throw new CustomError(400, "Verification token required");

    const decoded = jwt.verify(
      token as string,
      process.env.JWT_SECRET as string
    ) as { email: string };
    const user = await User.findOne({ email: decoded.email });

    if (!user) throw new CustomError(404, "User not found");
    if (user.isVerifiedUser)
      throw new CustomError(400, "User already verified");

    user.isVerifiedUser = true;
    await user.save();

    res.status(200).json({
      message: "User verified successfully. You can now close this tab.",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TokenExpiredError") {
      next(new CustomError(400, "Verification token has expired."));
    } else if (error instanceof Error) {
      next(new CustomError(500, error.message));
    }
  }
};

export {
  register,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  sendVerificationEmail,
  verifyUser,
};

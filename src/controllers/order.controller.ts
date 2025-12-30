import { Request, Response, NextFunction } from "express";
import Stripe from "stripe";
import Order from "../models/orderModel";
import Cart from "../models/cartModel";
import { CustomError } from "../middlewares/error";
import { checkPermission } from "../helpers/authHelper";
import axios from "axios";
import { BASE_DOMAIN } from "../utils/globals";
import { applyCoupon, recordCouponUsage } from "./coupon.controller";
import {
  sendAdminNewOrderEmail,
  sendAdminPaymentReceivedEmail,
  sendOrderConfirmationEmail,
  sendPaymentConfirmationEmail,
} from "../utils/mailer";
import { Types } from "mongoose";
import {
  createInvoice,
  updateInvoicePaymentStatus,
  deleteInvoiceByOrderId,
} from "./invoice.controller";

// Initialize Stripe
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
//   apiVersion: "2024-11-20.acacia",
// });

// Best setup
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Get currency based on IP
const getCurrencyFromRegion = async (ip: string): Promise<string> => {
  try {
    const response = await axios.get(
      `https://ipinfo.io/${ip}/json?token=${process.env.IPINFO_TOKEN}`
    );
    return response.data.country === "IN" ? "inr" : "usd";
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error detecting region:", error);
      throw new CustomError(500, error.message);
    }
    return "usd";
  }
};

// Fetch exchange rate
const getExchangeRate = async (currency: string): Promise<number> => {
  if (currency === "usd") return 1;
  try {
    const response = await axios.get(
      "https://api.exchangerate-api.com/v4/latest/USD"
    );
    return response.data.rates[currency.toUpperCase()] || 84;
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error detecting currency:", error);
      throw new CustomError(500, error.message);
    }
    return 84; // Fallback rate
  }
};

// Helper to create Stripe session (in local currency)
const createStripeSession = async (
  cart: any,
  orderNumber: string,
  currency: string,
  exchangeRate: number,
  coupon: any,
  discountUSD: number,
  userId: string
): Promise<Stripe.Checkout.Session> => {
  const discountLocal = discountUSD * exchangeRate;

  return stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: cart.products.map((item: any) => {
      const product = item.product;
      const unitAmountUSD =
        item.wordCount && item.wordCount > 0
          ? (item.wordCount / 100) * product.pricePerUnit
          : product.pricePerUnit;
      const unitAmountLocal = unitAmountUSD * exchangeRate;

      let adjustedUnitAmount = unitAmountLocal;
      if (
        coupon &&
        coupon.discountType === "PRODUCT_SPECIFIC" &&
        coupon.specificProduct?.toString() === product._id.toString()
      ) {
        adjustedUnitAmount = unitAmountLocal * (1 - coupon.discountValue / 100);
      }

      return {
        price_data: {
          currency,
          product_data: { name: product.name },
          unit_amount: Math.round(adjustedUnitAmount * 100), // Local currency cents/paise
        },
        quantity: item.quantity,
      };
    }),
    ...(discountLocal > 0 && coupon?.discountType !== "PRODUCT_SPECIFIC"
      ? {
          discounts: [
            {
              coupon: await stripe.coupons
                .create({
                  amount_off: Math.round(discountLocal * 100),
                  currency,
                  duration: "once",
                })
                .then((c) => c.id),
            },
          ],
        }
      : {}),
    mode: "payment",
    success_url: `${BASE_DOMAIN}/expert-content-solutions/order/order-confirmation/${orderNumber}`,
    cancel_url: `${BASE_DOMAIN}/expert-content-solutions`,
    metadata: { userId, couponId: coupon?._id?.toString() || "" },
  });
};

// Helper to generate order number
const generateOrderNumber = (): string => {
  const now = new Date();
  return `${String(now.getDate()).padStart(2, "0")}${String(
    now.getMonth() + 1
  ).padStart(2, "0")}${String(now.getFullYear()).slice(-2)}${String(
    now.getHours()
  ).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
};

// *********************************************************
// ************ Create an Order and Initiate Payment *******
// *********************************************************
export const createOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req;
    const { couponCode, paymentMethod, ip } = req.body;

    if (!userId) {
      return next(
        new CustomError(401, "User must be logged in to create an order")
      );
    }

    const cart = await Cart.findOne({ userId }).populate("products.product");
    if (!cart || cart.products.length === 0) {
      return res.status(400).json({ message: "Cart is empty." });
    }

    const currency = await getCurrencyFromRegion(ip);
    const exchangeRate = await getExchangeRate(currency);
    const totalPriceUSD = cart.totalPrice;

    let coupon = null;
    let discountUSD = 0;
    let finalPriceUSD = cart.totalPrice;

    if (couponCode) {
      const couponResult = await applyCoupon(couponCode, cart, userId);
      coupon = couponResult.coupon;
      discountUSD = couponResult.discountUSD;
      finalPriceUSD = couponResult.finalPriceUSD;
    }

    const orderNumber = generateOrderNumber();

    const orderData = {
      orderNumber,
      userId,
      products: cart.products,
      totalQuantity: cart.totalQuantity,
      totalPrice: totalPriceUSD,
      couponDiscount: discountUSD,
      finalPrice: finalPriceUSD,
      couponId: coupon?._id || null,
      invoiceId: "",
      paymentMethod,
    };

    let newOrder;
    if (finalPriceUSD === 0) {
      newOrder = new Order({
        ...orderData,
        paymentId: null,
        paymentUrl: null,
        paymentStatus: "Paid",
      });
      await newOrder.save();
    } else {
      const session = await createStripeSession(
        cart,
        orderNumber,
        currency,
        exchangeRate,
        coupon,
        discountUSD,
        userId
      );
      newOrder = new Order({
        ...orderData,
        paymentId: session.id,
        paymentUrl: session.url,
        status: "Pending",
        paymentStatus: "Unpaid",
      });
      await newOrder.save();
    }

    // Create invoice for both free and paid orders
    await createInvoice(newOrder._id.toString(), paymentMethod);

    await cart.updateOne({ products: [], totalPrice: 0, totalQuantity: 0 });

    Promise.all([
      sendOrderConfirmationEmail(newOrder._id.toString()),
      sendAdminNewOrderEmail(newOrder._id.toString()),
    ]).catch((err) => console.error("Email sending failed:", err));

    const response = {
      message: "Order created successfully.",
      data: newOrder,
      redirectUrl:
        finalPriceUSD === 0
          ? `${BASE_DOMAIN}/expert-content-solutions/order/order-confirmation/${orderNumber}`
          : undefined,
      sessionId: finalPriceUSD !== 0 ? newOrder.paymentId : undefined,
    };

    res.status(201).json(response);
  } catch (error) {
    console.error(`Error in createOrder:`, error);
    next(
      new CustomError(
        500,
        error instanceof Error ? error.message : "An unknown error occurred."
      )
    );
  }
};

// *********************************************************
// ************** Handle Stripe Webhook Events *************
// *********************************************************
export const stripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"]!;
  if (!sig) {
    return res.status(400).send("Missing Stripe signature header");
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    if (err instanceof Error) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    } else {
      return res.status(400).send(`Webhook Error: ${err}`);
    }
  }

  switch (event.type) {
    case "checkout.session.completed":
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.payment_status === "paid") {
        const updatedOrder = await Order.findOneAndUpdate(
          { paymentId: session.id },
          {
            paymentStatus: "Paid",
            paymentDate: Date.now(),
          },
          { new: true }
        );
        if (updatedOrder) {
          // Update invoice payment status
          await updateInvoicePaymentStatus(updatedOrder._id.toString(), "Paid");

          // Record coupon usage after successful payment
          if (session.metadata.couponId) {
            await recordCouponUsage(
              new Types.ObjectId(session.metadata.couponId),
              session.metadata.userId
            );
          }

          // Send emails asynchronously
          Promise.all([
            sendPaymentConfirmationEmail(updatedOrder._id.toString()),
            sendAdminPaymentReceivedEmail(updatedOrder._id.toString()),
          ]).catch((err) => console.error("Email sending failed:", err));
        }
      }
      break;

    case "checkout.session.expired":
      const expiredSession = event.data.object as Stripe.Checkout.Session;
      const updatedOrder = await Order.findOneAndUpdate(
        { paymentId: expiredSession.id },
        { paymentStatus: "Unpaid" },
        { new: true }
      );
      if (updatedOrder) {
        await updateInvoicePaymentStatus(updatedOrder._id.toString(), "Unpaid");

        // Create a new checkout session if expired
        const cart = await Cart.findOne({
          userId: expiredSession.metadata.userId,
        });
        if (cart && cart.products.length > 0) {
          const newSession = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: cart.products.map((product: any) => ({
              price_data: {
                currency: "usd",
                product_data: {
                  name: product.product.name,
                },
                unit_amount: Math.round(product.totalPrice * 100),
              },
              quantity: product.quantity,
            })),
            mode: "payment",
            success_url: expiredSession.success_url,
            cancel_url: expiredSession.cancel_url,
            metadata: {
              userId: expiredSession.metadata.userId,
              couponId: expiredSession.metadata.couponId,
            },
          });

          await Order.findOneAndUpdate(
            { paymentId: expiredSession.id },
            {
              paymentUrl: newSession.url,
              paymentId: newSession.id,
            },
            { new: true }
          );
        }
      }
      break;

    default:
  }

  res.status(200).json({ received: true });
};

// *********************************************************
// ************ Retrieve All Orders for Admin **************
// *********************************************************
export const getOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req;
    const { orderNumber } = req.query;

    // Check Permission
    const permissionCheck = await checkPermission(userId, "orders", 2);
    if (!permissionCheck) {
      return res.status(403).json({ message: "Permission denied" });
    }

    let orders;
    if (orderNumber) {
      orders = await Order.findOne({ orderNumber: orderNumber })
        .populate(
          "userId",
          "-wishlist -orderHistory -refreshToken -createdAt -updatedAt -__v"
        )
        .populate({
          path: "products.product",
          populate: {
            path: "category",
            select: "name",
          },
        })
        .lean();
      if (!orders) {
        return res.status(404).json({ message: "Order not found." });
      }
    } else {
      orders = await Order.find()
        .sort({ createdAt: -1 })
        .populate({
          path: "products.product",
          populate: {
            path: "category",
            select: "name",
          },
        })
        .populate(
          "userId",
          "-wishlist -orderHistory -refreshToken -createdAt -updatedAt -__v"
        )
        .lean();
    }

    res.status(200).json({ data: orders });
  } catch (error) {
    if (error instanceof Error) {
      next(new CustomError(500, error.message));
    } else {
      next(new CustomError(500, "An unknown error occurred."));
    }
  }
};

// *********************************************************
// ************ Update Order (Admin) ***********************
// *********************************************************
export const updateOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req;
    const { orderId } = req.query;
    const updateData = req.body;

    // Check Permission
    const permissionCheck = await checkPermission(userId, "orders", 3);
    if (!permissionCheck) {
      return res.status(403).json({ message: "Permission denied" });
    }

    if (updateData.paymentStatus) {
      // Update invoice payment status
      await updateInvoicePaymentStatus(
        orderId.toString(),
        updateData.paymentStatus
      );
    }

    const updatedOrder = await Order.findByIdAndUpdate(orderId, updateData, {
      new: true,
    });

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found." });
    }

    res
      .status(200)
      .json({ message: "Order updated successfully.", data: updatedOrder });
  } catch (error) {
    if (error instanceof Error) {
      next(new CustomError(500, error.message));
    } else {
      next(new CustomError(500, "An unknown error occurred."));
    }
  }
};

// *********************************************************
// ************** Delete an Order by ID ********************
// *********************************************************
export const deleteOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req;
    const { orderId } = req.query;

    // Check Permission
    const permissionCheck = await checkPermission(userId, "orders", 4);
    if (!permissionCheck) {
      return res.status(403).json({ message: "Permission denied" });
    }

    const deletedOrder = await Order.findByIdAndDelete(orderId);
    if (!deletedOrder) {
      return res.status(404).json({ message: "Order not found." });
    }

    // Delete associated invoice
    await deleteInvoiceByOrderId(orderId.toString());

    res
      .status(200)
      .json({ message: "Order and associated invoice deleted successfully." });
  } catch (error) {
    if (error instanceof Error) {
      next(new CustomError(500, error.message));
    } else {
      next(new CustomError(500, "An unknown error occurred."));
    }
  }
};

// *********************************************************
// ************ Retrieve Order Statistics for Dashboard ****
// *********************************************************
export const getOrderStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req;

    // Check Permission
    const permissionCheck = await checkPermission(userId, "orders", 2);
    if (!permissionCheck) {
      return res.status(403).json({ message: "Permission denied" });
    }

    // Define date ranges in UTC for consistency
    const now = new Date();
    const currentMonthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
    );
    const prevMonthEnd = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0)
    );
    const prevMonthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)
    );
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setUTCHours(23, 59, 59, 999);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);
    sevenDaysAgo.setUTCHours(0, 0, 0, 0);

    const [stats] = await Order.aggregate([
      {
        $facet: {
          currentMonthOrders: [
            { $match: { createdAt: { $gte: currentMonthStart, $lte: now } } },
            {
              $group: {
                _id: null,
                newOrders: { $sum: 1 },
                sales: {
                  $sum: {
                    $cond: [
                      { $eq: ["$paymentStatus", "Paid"] },
                      "$totalPrice",
                      0,
                    ],
                  },
                },
                revenue: {
                  $sum: {
                    $cond: [
                      { $eq: ["$paymentStatus", "Paid"] },
                      "$finalPrice",
                      0,
                    ],
                  },
                },
              },
            },
          ],
          previousMonthOrders: [
            {
              $match: {
                createdAt: { $gte: prevMonthStart, $lte: prevMonthEnd },
              },
            },
            {
              $group: {
                _id: null,
                newOrders: { $sum: 1 },
                sales: {
                  $sum: {
                    $cond: [
                      { $eq: ["$paymentStatus", "Paid"] },
                      "$totalPrice",
                      0,
                    ],
                  },
                },
                revenue: {
                  $sum: {
                    $cond: [
                      { $eq: ["$paymentStatus", "Paid"] },
                      "$finalPrice",
                      0,
                    ],
                  },
                },
              },
            },
          ],
          allTimeMetrics: [
            {
              $group: {
                _id: null,
                sales: {
                  $sum: {
                    $cond: [
                      { $eq: ["$paymentStatus", "Paid"] },
                      "$totalPrice",
                      0,
                    ],
                  },
                },
                revenue: {
                  $sum: {
                    $cond: [
                      { $eq: ["$paymentStatus", "Paid"] },
                      "$finalPrice",
                      0,
                    ],
                  },
                },
                allOrders: { $sum: 1 },
                paidOrders: {
                  $sum: { $cond: [{ $eq: ["$paymentStatus", "Paid"] }, 1, 0] },
                },
                completedOrders: {
                  $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] },
                },
              },
            },
          ],
          dailyOrders: [
            { $match: { createdAt: { $gte: todayStart, $lte: todayEnd } } },
            { $group: { _id: null, count: { $sum: 1 } } },
          ],
          chartData: [
            { $match: { createdAt: { $gte: sevenDaysAgo, $lte: todayEnd } } },
            {
              $group: {
                _id: {
                  $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                },
                newOrders: { $sum: 1 },
                sales: {
                  $sum: {
                    $cond: [
                      { $eq: ["$paymentStatus", "Paid"] },
                      "$totalPrice",
                      0,
                    ],
                  },
                },
                revenue: {
                  $sum: {
                    $cond: [
                      { $eq: ["$paymentStatus", "Paid"] },
                      "$finalPrice",
                      0,
                    ],
                  },
                },
              },
            },
            {
              $project: {
                date: "$_id",
                newOrders: 1,
                sales: 1,
                revenue: 1,
                _id: 0,
              },
            },
            { $sort: { date: 1 } },
          ],
        },
      },
    ]);

    const currentMonthNewOrders = stats.currentMonthOrders[0]?.newOrders || 0;
    const currentMonthSales = stats.currentMonthOrders[0]?.sales || 0;
    const currentMonthRevenue = stats.currentMonthOrders[0]?.revenue || 0;

    const prevMonthNewOrders = stats.previousMonthOrders[0]?.newOrders || 0;
    const prevMonthSales = stats.previousMonthOrders[0]?.sales || 0;
    const prevMonthRevenue = stats.previousMonthOrders[0]?.revenue || 0;

    const allTimeSales = stats.allTimeMetrics[0]?.sales || 0;
    const allTimeRevenue = stats.allTimeMetrics[0]?.revenue || 0;
    const allOrders = stats.allTimeMetrics[0]?.allOrders || 0;
    const paidOrders = stats.allTimeMetrics[0]?.paidOrders || 0;
    const completedOrders = stats.allTimeMetrics[0]?.completedOrders || 0;
    const dailyOrders = stats.dailyOrders[0]?.count || 0;

    const newOrdersChange =
      prevMonthNewOrders === 0
        ? currentMonthNewOrders > 0
          ? 100
          : 0
        : ((currentMonthNewOrders - prevMonthNewOrders) / prevMonthNewOrders) *
          100;

    const salesChange =
      prevMonthSales === 0
        ? currentMonthSales > 0
          ? 100
          : 0
        : ((currentMonthSales - prevMonthSales) / prevMonthSales) * 100;

    const revenueChange =
      prevMonthRevenue === 0
        ? currentMonthRevenue > 0
          ? 100
          : 0
        : ((currentMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100;

    const weekdayMap = {
      "1": "Sun",
      "2": "Mon",
      "3": "Tue",
      "4": "Wed",
      "5": "Thu",
      "6": "Fri",
      "7": "Sat",
    };

    const fullWeek = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(sevenDaysAgo);
      date.setDate(sevenDaysAgo.getDate() + i);
      const dayNumber = String(date.getDay() + 1);
      return {
        date: date.toISOString().split("T")[0],
        dayNumber,
        newOrders: 0,
        sales: 0,
        revenue: 0,
      };
    });

    stats.chartData.forEach((item: any) => {
      const index = fullWeek.findIndex((d) => d.date === item.date);
      if (index !== -1) {
        fullWeek[index].newOrders = item.newOrders || 0;
        fullWeek[index].sales = item.sales || 0;
        fullWeek[index].revenue = item.revenue || 0;
      }
    });

    const response = {
      newOrders: {
        count: currentMonthNewOrders,
        percentageChange: Number(newOrdersChange.toFixed(2)),
        trend:
          newOrdersChange > 0
            ? "increased"
            : newOrdersChange < 0
            ? "decreased"
            : "unchanged",
      },
      sales: {
        total: allTimeSales,
        percentageChange: Number(salesChange.toFixed(2)),
        trend:
          salesChange > 0
            ? "increased"
            : salesChange < 0
            ? "decreased"
            : "unchanged",
      },
      revenue: {
        total: allTimeRevenue,
        percentageChange: Number(revenueChange.toFixed(2)),
        trend:
          revenueChange > 0
            ? "increased"
            : revenueChange < 0
            ? "decreased"
            : "unchanged",
      },
      allOrders,
      paidOrders,
      dailyOrders,
      completedOrders,
      chartData: {
        newOrders: fullWeek.map((item) => ({
          day: weekdayMap[item.dayNumber as keyof typeof weekdayMap],
          orders: item.newOrders,
          date: item.date,
        })),
        sales: fullWeek.map((item) => ({
          day: weekdayMap[item.dayNumber as keyof typeof weekdayMap],
          sale: item.sales,
          date: item.date,
        })),
        revenue: fullWeek.map((item) => ({
          day: weekdayMap[item.dayNumber as keyof typeof weekdayMap],
          revenue: item.revenue,
          date: item.date,
        })),
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    if (error instanceof Error) {
      next(new CustomError(500, error.message));
    } else {
      next(new CustomError(500, "An unknown error occurred"));
    }
  }
};

// *********************************************************
// ************ Retrieve Sales Report for a Specific Year ****
// *********************************************************
export const getSalesReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req;
    const { year } = req.query;

    // Check Permission
    const permissionCheck = await checkPermission(userId, "orders", 2);
    if (!permissionCheck) {
      return res.status(403).json({ message: "Permission denied" });
    }

    // Default to current year if not provided
    const selectedYear = year
      ? parseInt(year as string)
      : new Date().getFullYear();

    // Define the date range for the selected year
    const startDate = new Date(selectedYear, 0, 1); // Jan 1st
    const endDate = new Date(selectedYear, 11, 31, 23, 59, 59, 999); // Dec 31st

    // Fetch orders for the selected year
    const orders = await Order.find({
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
      paymentStatus: "Paid",
    }).lean();

    // Aggregate data by month
    const monthlyData: Record<string, { sales: number; revenue: number }> = {};
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    // Initialize all months with 0 values
    months.forEach((month) => {
      monthlyData[month] = { sales: 0, revenue: 0 };
    });

    // Aggregate orders by month
    orders.forEach((order) => {
      const month = new Date(order.createdAt).toLocaleString("en-US", {
        month: "short",
      });
      monthlyData[month].sales += order.totalPrice;
      monthlyData[month].revenue += order.finalPrice;
    });

    // Convert to array for chart
    const salesReport = months.map((month) => ({
      month,
      sales: monthlyData[month].sales,
      revenue: monthlyData[month].revenue,
    }));

    res.status(200).json({ data: salesReport });
  } catch (error) {
    if (error instanceof Error) {
      next(new CustomError(500, error.message));
    } else {
      next(new CustomError(500, "An unknown error occurred."));
    }
  }
};

// *********************** USER ****************************

// *********************************************************
// ************ Retrieve Orders by User ID *****************
// *********************************************************
export const getOrdersByUserId = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req;
    const { orderNumber } = req.query;

    let orders;
    if (orderNumber) {
      orders = await Order.findOne({ userId, orderNumber: orderNumber })
        .populate({
          path: "products.product",
          populate: {
            path: "category",
            model: "Product_Category",
            select: "_id name",
          },
        })
        .lean();
      if (!orders) {
        return res.status(404).json({ message: "Order not found." });
      }
    } else {
      orders = await Order.find({ userId })
        .populate({
          path: "products.product",
          populate: {
            path: "category",
            model: "Product_Category",
            select: "_id name",
          },
        })
        .sort({ createdAt: -1 })
        .lean();
    }

    res.status(200).json({ data: orders });
  } catch (error) {
    if (error instanceof Error) {
      next(new CustomError(500, error.message));
    } else {
      next(new CustomError(500, "An unknown error occurred."));
    }
  }
};

import puppeteer, { Browser, Page } from "puppeteer";
import { Request, Response, NextFunction } from "express";
import Invoice from "../models/invoice.model";
import Order from "../models/orderModel";
import { CustomError } from "../middlewares/error";
import { checkPermission } from "../helpers/authHelper";
import {
  sendAdminNewInvoiceEmail,
  sendInvoiceGeneratedEmail,
} from "../utils/mailer";
import { formatDate } from "../utils/formatDate";

// Helper to generate invoice number
const generateInvoiceNumber = (orderNumber: string): string => {
  return `INV-${orderNumber}`;
};

// Helper to generate HTML content for the invoice PDF
const generateInvoiceHtml = (invoice: any, baseUrl: string): string => {
  const logoUrl =
    "https://res.cloudinary.com/adaired/image/upload/f_auto,q_auto/v1/Static%20Website%20Images/adaired_logo"; // Replace with actual logo URL
  const qrCodeValue = `${baseUrl}/invoices/download?invoiceNumber=${invoice.invoiceNumber}`;
  const statusColorMap: { [key: string]: string } = {
    Paid: "background-color: #22c55e; color: #ffffff;",
    Unpaid: "background-color: #eab308; color: #ffffff;",
    Overdue: "background-color: #ef4444; color: #ffffff;",
    Cancelled: "background-color: #6b7280; color: #ffffff;",
  };
  const statusColor =
    statusColorMap[String(invoice.status)] ||
    "background-color: #3b82f6; color: #ffffff;";

  // Generate table rows for order items
  const tableRows = invoice.orderId.products
    .map(
      (item: any, index: number) => `
      <tr>
        <td style="padding: 8px 16px; border-bottom: 1px solid #e5e7eb;">${
          index + 1
        }</td>
        <td style="padding: 8px 16px; border-bottom: 1px solid #e5e7eb;">
          <h6 style="font-size: 14px; font-weight: 500; margin: 0;">${
            item.product.name
          }</h6>
        </td>
        <td style="padding: 8px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 500;">
          $${item.product.pricePerUnit} / ${item.product.minimumWords} words
        </td>
        <td style="padding: 8px 16px; border-bottom: 1px solid #e5e7eb;">${
          item.quantity
        }</td>
        <td style="padding: 8px 16px; border-bottom: 1px solid #e5e7eb;">${
          item.wordCount
        }</td>
        <td style="padding: 8px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 500;">$${
          item.totalPrice
        }</td>
      </tr>
    `
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
          body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 14px;
            margin: 0;
            padding: 40px;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            border: 1px solid #e5e7eb;
            padding: 32px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 48px;
          }
          .logo {
            max-width: 150px;
          }
          .badge {
            padding: 6px 12px;
            border-radius: 6px;
            font-weight: 500;
            ${statusColor}
          }
          .title {
            font-size: 18px;
            font-weight: 600;
            margin: 8px 0 4px;
          }
          .text-gray {
            color: #6b7280;
          }
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 16px;
            margin-bottom: 48px;
          }
          .text-sm {
            font-size: 14px;
          }
          .font-semibold {
            font-weight: 600;
          }
          .uppercase {
            text-transform: uppercase;
          }
          .table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 44px;
          }
          .table th,
          .table td {
            border-bottom: 1px solid #e5e7eb;
            padding: 8px 16px;
            text-align: left;
          }
          .table th {
            font-weight: 600;
          }
          .footer {
            display: flex;
            justify-content: space-between;
            border-top: 1px solid #e5e7eb;
            padding-top: 32px;
            padding-bottom: 24px;
          }
          .notes {
            max-width: 300px;
          }
          .totals {
            max-width: 200px;
            width: 100%;
          }
          .totals div {
            display: flex;
            justify-content: space-between;
            padding: 14px 0;
            border-bottom: 1px solid #e5e7eb;
          }
          .totals .total {
            font-size: 16px;
            font-weight: 600;
            color: #111827;
            padding-top: 16px;
          }
          .qr-code {
            text-align: right;
          }
          @media print {
            .container {
              border: none;
              padding: 24px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="${logoUrl}" alt="Adaired Digital Media" class="logo" />
            <div>
              <span class="badge">${invoice.status}</span>
              <h6 class="title">${invoice.invoiceNumber}</h6>
              <p class="text-sm text-gray">Invoice Number</p>
            </div>
          </div>
          <div class="grid">
            <div>
              <h6 class="text-sm font-semibold">From</h6>
              <p class="text-sm font-semibold uppercase">Adaired Digital Media</p>
              <div class="text-sm">
                <p class="font-semibold">Creation Date</p>
                <p>${formatDate(invoice.createdAt)}</p>
              </div>
            </div>
            <div>
              <h6 class="text-sm font-semibold">Bill To</h6>
              <p class="text-sm font-semibold uppercase">${
                invoice.userId?.name || "N/A"
              }</p>
              <div class="text-sm">
                <p class="font-semibold">Due Date</p>
                <p>${formatDate(invoice.dueDate)}</p>
              </div>
            </div>
            <div class="qr-code">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=112x112&data=${encodeURIComponent(
                qrCodeValue
              )}" alt="QR Code" />
            </div>
          </div>
          <table class="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Item</th>
                <th>Unit Price</th>
                <th>Quantity</th>
                <th>Word Count</th>
                <th>Total Price</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          <div class="footer">
            <div class="notes">
              <h6 class="text-sm font-semibold uppercase">Notes</h6>
              <p class="text-sm">We appreciate your business, and hope to be working with you again very soon!</p>
            </div>
            <div class="totals">
              <div>
                <span>Subtotal:</span>
                <span class="font-semibold">$${invoice.totalAmount}</span>
              </div>
              <div>
                <span>Discount:</span>
                <span class="font-semibold">$${invoice.discountAmount}</span>
              </div>
              <div class="total">
                <span>Total:</span>
                <span>$${invoice.finalAmount}</span>
              </div>
            </div>
          </div>
          <div class="text-center text-sm" style="margin-top: 24px;">
            <span style="font-weight: 700;">Adaired Digital Media</span>
          </div>
        </div>
      </body>
    </html>
  `;
};

// *********************************************************
// ******************* Create an invoice *******************
// *********************************************************

export const createInvoice = async (
  orderId: string,
  paymentMethod: string
): Promise<string> => {
  const order = await Order.findById(orderId).populate("userId");
  if (!order) {
    throw new CustomError(404, "Order not found.");
  }

  // Check if invoice already exists
  const existingInvoice = await Invoice.findOne({ orderId });
  if (existingInvoice) {
    throw new CustomError(400, "Invoice already exists for this order.");
  }

  const invoiceNumber = generateInvoiceNumber(order.orderNumber);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7); // Due in 7 days

  const invoiceData = {
    invoiceNumber,
    orderId,
    userId: order.userId,
    totalAmount: order.totalPrice,
    discountAmount: order.couponDiscount,
    finalAmount: order.finalPrice,
    status: order.paymentStatus === "Paid" ? "Paid" : "Unpaid",
    dueDate,
    paymentMethod,
    paymentId: order.paymentId,
    zohoInvoiceId: order.zohoInvoiceId,
  };

  const newInvoice = new Invoice(invoiceData);
  await newInvoice.save();

  // Update order with invoiceNumber
  await Order.findByIdAndUpdate(orderId, { invoiceId: invoiceNumber });

  // Send emails asynchronously
  Promise.all([
    sendInvoiceGeneratedEmail(newInvoice._id.toString()),
    sendAdminNewInvoiceEmail(newInvoice._id.toString()),
  ]).catch((err) => console.error("Email sending failed:", err));

  return newInvoice._id.toString();
};

// *********************************************************
// ************ Update invoice payment status **************
// *********************************************************
export const updateInvoicePaymentStatus = async (
  orderId: string,
  paymentStatus: string
): Promise<void> => {
  const invoice = await Invoice.findOne({ orderId });
  if (invoice) {
    const newStatus =
      paymentStatus === "Paid"
        ? "Paid"
        : paymentStatus === "Failed"
        ? "Failed"
        : paymentStatus === "Refunded"
        ? "Refunded"
        : "Unpaid";
    await Invoice.findByIdAndUpdate(invoice._id, { status: newStatus });
  }
};

// *********************************************************
// ************** Delete invoice by orderId ****************
// *********************************************************
export const deleteInvoiceByOrderId = async (
  orderId: string
): Promise<void> => {
  await Invoice.findOneAndDelete({ orderId });
};

// **************************************************************
// *** Get all invoices or specific invoice by number (Admin) ***
// **************************************************************
export const getInvoices = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req;
    const { invoiceNumber } = req.query;

    // Check Permission
    const permissionCheck = await checkPermission(userId, "invoices", 2);
    if (!permissionCheck) {
      return res.status(403).json({ message: "Permission denied" });
    }

    let invoices;
    if (invoiceNumber) {
      invoices = await Invoice.findOne({ invoiceNumber })
        .populate(
          "userId",
          "-wishlist -orderHistory -refreshToken -createdAt -updatedAt -__v"
        )
        .populate({
          path: "orderId",
          populate: {
            path: "products.product",
            populate: { path: "category", select: "name" },
          },
        })
        .lean();
      if (!invoices) {
        return res.status(404).json({ message: "Invoice not found." });
      }
    } else {
      invoices = await Invoice.find()
        .sort({ createdAt: -1 })
        .populate(
          "userId",
          "-wishlist -orderHistory -refreshToken -createdAt -updatedAt -__v"
        )
        .populate({
          path: "orderId",
          populate: {
            path: "products.product",
            populate: { path: "category", select: "name" },
          },
        })
        .lean();
    }

    res.status(200).json({
      success: true,
      message: "Invoices fetched successfully",
      data: invoices,
    });
  } catch (error) {
    next(
      new CustomError(
        500,
        error instanceof Error ? error.message : "An unknown error occurred."
      )
    );
  }
};

// **************************************************************
// ********************** Update invoice (Admin) ****************
// **************************************************************
export const updateInvoice = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req;
    const { invoiceId } = req.query;
    const updateData = req.body;

    // Check Permission
    const permissionCheck = await checkPermission(userId, "invoices", 3);
    if (!permissionCheck) {
      return res.status(403).json({ message: "Permission denied" });
    }

    const updatedInvoice = await Invoice.findByIdAndUpdate(
      invoiceId,
      updateData,
      {
        new: true,
      }
    );

    if (!updatedInvoice) {
      return res.status(404).json({ message: "Invoice not found." });
    }

    res.status(200).json({
      success: true,
      message: "Invoice updated successfully.",
      data: updatedInvoice,
    });
  } catch (error) {
    next(
      new CustomError(
        500,
        error instanceof Error ? error.message : "An unknown error occurred."
      )
    );
  }
};

// **************************************************************
// **************** Delete invoice by ID (Admin) ****************
// **************************************************************
export const deleteInvoice = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req;
    const { invoiceId } = req.query;

    // Check Permission
    const permissionCheck = await checkPermission(userId, "invoices", 4);
    if (!permissionCheck) {
      return res.status(403).json({ message: "Permission denied" });
    }

    const deletedInvoice = await Invoice.findByIdAndDelete(invoiceId);
    if (!deletedInvoice) {
      return res.status(404).json({ message: "Invoice not found." });
    }

    // Remove invoiceId from associated order
    await Order.findOneAndUpdate(
      { invoiceId: deletedInvoice.invoiceNumber },
      { invoiceId: null }
    );

    res
      .status(200)
      .json({ success: true, message: "Invoice deleted successfully." });
  } catch (error) {
    next(
      new CustomError(
        500,
        error instanceof Error ? error.message : "An unknown error occurred."
      )
    );
  }
};

// **************************************************************
// ****************** Get invoices by user ID *******************
// **************************************************************
export const getInvoicesByUserId = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req;
    const { invoiceNumber } = req.query;

    let invoices;
    if (invoiceNumber) {
      invoices = await Invoice.findOne({ userId, invoiceNumber })
        .populate(
          "userId",
          "-wishlist -orderHistory -refreshToken -createdAt -updatedAt -__v"
        )
        .populate({
          path: "orderId",
          populate: {
            path: "products.product",
            populate: {
              path: "category",
              model: "Product_Category",
              select: "_id name",
            },
          },
        })
        .lean();
      if (!invoices) {
        return res.status(404).json({ message: "Invoice not found." });
      }
    } else {
      invoices = await Invoice.find({ userId })
        .populate(
          "userId",
          "-wishlist -orderHistory -refreshToken -createdAt -updatedAt -__v"
        )
        .populate({
          path: "orderId",
          populate: {
            path: "products.product",
            populate: {
              path: "category",
              model: "Product_Category",
              select: "_id name",
            },
          },
        })
        .sort({ createdAt: -1 })
        .lean();
    }

    res.status(200).json({
      success: true,
      message: "Invoice fetched successfully",
      data: invoices,
    });
  } catch (error) {
    next(
      new CustomError(
        500,
        error instanceof Error ? error.message : "An unknown error occurred."
      )
    );
  }
};

// **************************************************************
// ********** Get invoice statistics for dashboard **************
// **************************************************************
export const getInvoiceStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req;

    // Check Permission
    const permissionCheck = await checkPermission(userId, "invoices", 2);
    if (!permissionCheck) {
      return res.status(403).json({ message: "Permission denied" });
    }

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
    const todayStart = new Date(now).setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date(now).setUTCHours(23, 59, 59, 999);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);
    sevenDaysAgo.setUTCHours(0, 0, 0, 0);

    const [stats] = await Invoice.aggregate([
      {
        $facet: {
          currentMonthInvoices: [
            { $match: { createdAt: { $gte: currentMonthStart, $lte: now } } },
            { $group: { _id: null, newInvoices: { $sum: 1 } } },
          ],
          previousMonthInvoices: [
            {
              $match: {
                createdAt: { $gte: prevMonthStart, $lte: prevMonthEnd },
              },
            },
            {
              $group: {
                _id: null,
                newInvoices: { $sum: 1 },
                totalAmount: {
                  $sum: {
                    $cond: [{ $eq: ["$status", "Paid"] }, "$totalAmount", 0],
                  },
                },
                finalAmount: {
                  $sum: {
                    $cond: [{ $eq: ["$status", "Paid"] }, "$finalAmount", 0],
                  },
                },
              },
            },
          ],
          allTimeMetrics: [
            {
              $group: {
                _id: null,
                totalAmount: {
                  $sum: {
                    $cond: [{ $eq: ["$status", "Paid"] }, "$totalAmount", 0],
                  },
                },
                finalAmount: {
                  $sum: {
                    $cond: [{ $eq: ["$status", "Paid"] }, "$finalAmount", 0],
                  },
                },
                allInvoices: { $sum: 1 },
                paidInvoices: {
                  $sum: { $cond: [{ $eq: ["$status", "Paid"] }, 1, 0] },
                },
                overdueInvoices: {
                  $sum: { $cond: [{ $eq: ["$status", "Overdue"] }, 1, 0] },
                },
              },
            },
          ],
          dailyInvoices: [
            {
              $match: {
                createdAt: {
                  $gte: new Date(todayStart),
                  $lte: new Date(todayEnd),
                },
              },
            },
            { $group: { _id: null, count: { $sum: 1 } } },
          ],
          chartData: [
            {
              $match: {
                createdAt: { $gte: sevenDaysAgo, $lte: new Date(todayEnd) },
              },
            },
            {
              $group: {
                _id: {
                  $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                },
                newInvoices: { $sum: 1 },
                totalAmount: {
                  $sum: {
                    $cond: [{ $eq: ["$status", "Paid"] }, "$totalAmount", 0],
                  },
                },
                finalAmount: {
                  $sum: {
                    $cond: [{ $eq: ["$status", "Paid"] }, "$finalAmount", 0],
                  },
                },
              },
            },
            {
              $project: {
                date: "$_id",
                newInvoices: 1,
                totalAmount: 1,
                finalAmount: 1,
                _id: 0,
              },
            },
            { $sort: { date: 1 } },
          ],
        },
      },
    ]);

    const currentMonthNewInvoices =
      stats.currentMonthInvoices[0]?.newInvoices || 0;
    const prevMonthNewInvoices =
      stats.previousMonthInvoices[0]?.newInvoices || 0;
    const prevMonthTotalAmount =
      stats.previousMonthInvoices[0]?.totalAmount || 0;
    const prevMonthFinalAmount =
      stats.previousMonthInvoices[0]?.finalAmount || 0;
    const allTimeTotalAmount = stats.allTimeMetrics[0]?.totalAmount || 0;
    const allTimeFinalAmount = stats.allTimeMetrics[0]?.finalAmount || 0;
    const allInvoices = stats.allTimeMetrics[0]?.allInvoices || 0;
    const paidInvoices = stats.allTimeMetrics[0]?.paidInvoices || 0;
    const overdueInvoices = stats.allTimeMetrics[0]?.overdueInvoices || 0;
    const dailyInvoices = stats.dailyInvoices[0]?.count || 0;

    const newInvoicesChange =
      prevMonthNewInvoices === 0
        ? currentMonthNewInvoices > 0
          ? 100
          : 0
        : ((currentMonthNewInvoices - prevMonthNewInvoices) /
            prevMonthNewInvoices) *
          100;
    const totalAmountChange =
      prevMonthTotalAmount === 0
        ? allTimeTotalAmount > 0
          ? 100
          : 0
        : ((allTimeTotalAmount - prevMonthTotalAmount) / prevMonthTotalAmount) *
          100;
    const finalAmountChange =
      prevMonthFinalAmount === 0
        ? allTimeFinalAmount > 0
          ? 100
          : 0
        : ((allTimeFinalAmount - prevMonthFinalAmount) / prevMonthFinalAmount) *
          100;

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
        newInvoices: 0,
        totalAmount: 0,
        finalAmount: 0,
      };
    });

    stats.chartData.forEach((item: any) => {
      const index = fullWeek.findIndex((d) => d.date === item.date);
      if (index !== -1) {
        fullWeek[index].newInvoices = item.newInvoices || 0;
        fullWeek[index].totalAmount = item.totalAmount || 0;
        fullWeek[index].finalAmount = item.finalAmount || 0;
      }
    });

    const response = {
      success: true,
      message: "Invoices stats fetched successfully",
      newInvoices: {
        count: currentMonthNewInvoices,
        percentageChange: Number(newInvoicesChange.toFixed(2)),
        trend:
          newInvoicesChange > 0
            ? "increased"
            : newInvoicesChange < 0
            ? "decreased"
            : "unchanged",
      },
      totalAmount: {
        total: allTimeTotalAmount,
        percentageChange: Number(totalAmountChange.toFixed(2)),
        trend:
          totalAmountChange > 0
            ? "increased"
            : totalAmountChange < 0
            ? "decreased"
            : "unchanged",
      },
      finalAmount: {
        total: allTimeFinalAmount,
        percentageChange: Number(finalAmountChange.toFixed(2)),
        trend:
          finalAmountChange > 0
            ? "increased"
            : finalAmountChange < 0
            ? "decreased"
            : "unchanged",
      },
      allInvoices,
      paidInvoices,
      overdueInvoices,
      dailyInvoices,
      chartData: {
        newInvoices: fullWeek.map((item) => ({
          day: weekdayMap[item.dayNumber as keyof typeof weekdayMap],
          invoices: item.newInvoices,
          date: item.date,
        })),
        totalAmount: fullWeek.map((item) => ({
          day: weekdayMap[item.dayNumber as keyof typeof weekdayMap],
          total: item.totalAmount,
          date: item.date,
        })),
        finalAmount: fullWeek.map((item) => ({
          day: weekdayMap[item.dayNumber as keyof typeof weekdayMap],
          final: item.finalAmount,
          date: item.date,
        })),
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    next(
      new CustomError(
        500,
        error instanceof Error ? error.message : "An unknown error occurred."
      )
    );
  }
};

// *********************************************************
// ***************** Download invoice PDF ******************
// *********************************************************
export const downloadInvoicePDF = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    const { invoiceNumber } = req.query;

    if (!invoiceNumber || typeof invoiceNumber !== "string") {
      throw new CustomError(400, "Invoice number is required.");
    }

    // Fetch invoice data
    const invoice = await Invoice.findOne({ invoiceNumber })
      .populate(
        "userId",
        "-wishlist -orderHistory -refreshToken -createdAt -updatedAt -__v"
      )
      .populate({
        path: "orderId",
        populate: {
          path: "products.product",
          populate: { path: "category", select: "name" },
        },
      })
      .lean();

    if (!invoice) {
      throw new CustomError(404, "Invoice not found.");
    }

    // Launch puppeteer
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
      timeout: 60000,
    });

    page = await browser.newPage();

    // Set viewport to A4 size (595px x 842px)
    await page.setViewport({ width: 595, height: 842, deviceScaleFactor: 1 });

    // Handle page errors
    page.on("error", (err) => {
      console.error("[downloadInvoicePDF] Puppeteer page error:", err);
      throw new CustomError(500, "Failed to process page content.");
    });

    // Generate HTML content
    const baseUrl = "http://localhost:5000/api/v2";
    const htmlContent = generateInvoiceHtml(invoice, baseUrl);

    // Set content and wait for QR code image to load
    await page.setContent(htmlContent, {
      waitUntil: "networkidle0",
      timeout: 60000,
    });

    // Ensure images are loaded
    const imageResults = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll("img"));
      return Promise.all(
        images.map((img) => {
          if (img.complete)
            return Promise.resolve({ src: img.src, status: "loaded" });
          return new Promise((resolve) => {
            img.onload = () => resolve({ src: img.src, status: "loaded" });
            img.onerror = () => {
              console.warn(
                `[downloadInvoicePDF] Image failed to load: ${img.src}`
              );
              resolve({ src: img.src, status: "failed" });
            };
          });
        })
      );
    });

    // Generate PDF as a buffer
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", right: "20mm", bottom: "20mm", left: "20mm" },
      timeout: 60000,
    });

    // Close browser
    await browser.close();

    // Set response headers for PDF download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Invoice_${invoiceNumber}.pdf`
    );
    res.setHeader("Content-Length", pdfBuffer.length);

    // Send PDF buffer
    res.end(pdfBuffer);
  } catch (error) {
    next(
      new CustomError(
        500,
        error instanceof Error ? error.message : "An unknown error occurred."
      )
    );
  }
};

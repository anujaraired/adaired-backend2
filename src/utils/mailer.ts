import * as nodemailer from "nodemailer";
import Order from "../models/orderModel";
import Invoice from "../models/invoice.model";

export const sendEmail = async (
  to: string,
  subject: string,
  html: string
): Promise<void> => {
  try {
    const transporter = nodemailer.createTransport({
      host: "mail.adaired.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const mailOptions = {
      from: `"Adaired" <${process.env.EMAIL_SENDER_EMAIL}>`,
      to,
      subject,
      html,
    };

    const response = await transporter.sendMail(mailOptions);
    if (response.rejected.length > 0) {
      console.error(`Email could not be sent to ${to}:`, response.rejected);
      throw new Error(`Email could not be sent to ${to}`);
    } else {
      console.log("Mail response : ", response);
      console.log(`Email sent successfully to ${to}`);
    }
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Email could not be sent");
  }
};

// Base email template
const emailTemplate = (
  subject: string,
  number: string,
  type: "order" | "invoice",
  greeting: string,
  date: string,
  totalAmount: string,
  paymentStatus: string,
  linkUrl: string,
  linkText: string,
  closing: string
) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f1f1; color: #000000;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #1B5A96, #000000); padding: 20px 0;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15); overflow: hidden; border: 1px solid #e0e0e0;">
          <tr>
            <td style="background-color: #599ff0; text-align: center;">
              <img src="https://res.cloudinary.com/adaired/image/upload/c_limit,w_384/f_auto/q_auto/v1/Static%20Website%20Images/adaired_logo.png" alt="Adaired" style="max-width: 200px; height: auto; filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));">
            </td>
          </tr>
          <tr>
            <td style="padding: 35px 40px; border: 1px solid #e0e0e0; border-top: none; border-bottom: none;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-right: 10px;">
                          <img src="https://res.cloudinary.com/adaired/image/upload/v1742983630/skgzh4ldyitthuntbrfg.gif" alt="icon" width="40" height="40" style="display: block;">
                        </td>
                        <td>
                          <h2 style="margin: 0; line-height: 36px; font-family: 'Open Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 30px; font-weight: normal; color: green;"><strong>Congratulations!</strong></h2>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <h2 style="margin: 0; line-height: 36px; font-family: 'Open Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 20px; font-weight: normal; color: #333333; text-align: center;"><strong>${subject}</strong></h2>
              <p style="margin: 0; font-family: 'Open Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 27px; color: #333333; font-size: 18px; padding: 10px 0;"><strong>${greeting}</strong></p>
              <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse: separate; border-spacing: 0px; border-width: 1px; border-style: solid; border-color: #e0e0e0; border-radius: 10px; background-color: #f9f9f9;" bgcolor="#f9f9f9" role="presentation">
                <tbody>
                  <tr>
                    <td align="left" style="margin: 0; padding-bottom: 15px; padding-top: 20px; padding-left: 20px; padding-right: 20px;">
                      <h2 style="margin: 0; line-height: 36px; font-family: 'Open Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 30px; font-weight: normal; color: #333333;"><strong>${
                        type === "order" ? "Order" : "Invoice"
                      } Details</strong></h2>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding: 0; margin: 0; padding-top: 5px; padding-bottom: 5px; font-size: 0;">
                      <table border="0" width="100%" height="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse: collapse; border-spacing: 0px;">
                        <tbody>
                          <tr>
                            <td style="padding: 0; margin: 0; border-bottom: 1px solid #e0e0e0; background: unset; height: 1px; width: 100%; margin: 0px;"></td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 0; margin: 0;">
                      <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="border-collapse: collapse; border-spacing: 0px;">
                        <tbody>
                          <tr>
                            <td align="left" valign="top" width="50%" style="margin: 0; padding-right: 5px; padding-top: 10px; padding-bottom: 10px; padding-left: 20px; border: 0;">
                              <span style="font-family: 'Open Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #666666; font-size: 18px; font-weight: 500;">${
                                type === "order" ? "Order" : "Invoice"
                              } Number</span>
                            </td>
                            <td align="right" valign="top" width="50%" style="margin: 0; padding-left: 5px; padding-top: 10px; padding-bottom: 10px; padding-right: 20px; border: 0;">
                              <span style="font-family: 'Open Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333333; font-size: 18px; font-weight: 600;">${number}</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding: 0; margin: 0; padding-top: 5px; padding-bottom: 5px; font-size: 0;">
                      <table border="0" width="100%" height="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse: collapse; border-spacing: 0px;">
                        <tbody>
                          <tr>
                            <td style="padding: 0; margin: 0; border-bottom: 1px solid #e0e0e0; background: unset; height: 1px; width: 100%; margin: 0px;"></td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 0; margin: 0;">
                      <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="border-collapse: collapse; border-spacing: 0px;">
                        <tbody>
                          <tr>
                            <td align="left" valign="top" width="50%" style="margin: 0; padding-right: 5px; padding-top: 10px; padding-bottom: 10px; padding-left: 20px; border: 0;">
                              <span style="font-family: 'Open Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #666666; font-size: 18px; font-weight: 500;">${
                                type === "order" ? "Order" : "Issued"
                              } Date</span>
                            </td>
                            <td align="right" valign="top" width="50%" style="margin: 0; padding-left: 5px; padding-top: 10px; padding-bottom: 10px; padding-right: 20px; border: 0;">
                              <span style="font-family: 'Open Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333333; font-size: 18px; font-weight: 600;">${date}</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding: 0; margin: 0; padding-top: 5px; padding-bottom: 5px; font-size: 0;">
                      <table border="0" width="100%" height="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse: collapse; border-spacing: 0px;">
                        <tbody>
                          <tr>
                            <td style="padding: 0; margin: 0; border-bottom: 1px solid #e0e0e0; background: unset; height: 1px; width: 100%; margin: 0px;"></td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 0; margin: 0;">
                      <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="border-collapse: collapse; border-spacing: 0px;">
                        <tbody>
                          <tr>
                            <td align="left" valign="top" width="50%" style="margin: 0; padding-right: 5px; padding-top: 10px; padding-bottom: 10px; padding-left: 20px; border: 0;">
                              <span style="font-family: 'Open Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #666666; font-size: 18px; font-weight: 500;">Total Amount</span>
                            </td>
                            <td align="right" valign="top" width="50%" style="margin: 0; padding-left: 5px; padding-top: 10px; padding-bottom: 10px; padding-right: 20px; border: 0;">
                              <span style="font-family: 'Open Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1B5A96; font-size: 18px; font-weight: 600;">${totalAmount}</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding: 0; margin: 0; padding-top: 5px; padding-bottom: 5px; font-size: 0;">
                      <table border="0" width="100%" height="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse: collapse; border-spacing: 0px;">
                        <tbody>
                          <tr>
                            <td style="padding: 0; margin: 0; border-bottom: 1px solid #e0e0e0; background: unset; height: 1px; width: 100%; margin: 0px;"></td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 0; margin: 0;">
                      <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="border-collapse: collapse; border-spacing: 0px;">
                        <tbody>
                          <tr>
                            <td align="left" valign="top" width="50%" style="margin: 0; padding-right: 5px; padding-top: 10px; padding-bottom: 15px; padding-left: 20px; border: 0;">
                              <span style="font-family: 'Open Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #666666; font-size: 18px; font-weight: 500;">Payment Status</span>
                            </td>
                            <td align="right" valign="top" width="50%" style="margin: 0; padding-left: 5px; padding-top: 10px; padding-bottom: 15px; padding-right: 20px; border: 0;">
                              <span style="font-family: 'Open Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333333; font-size: 18px; font-weight: 600;">${paymentStatus}</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${linkUrl}" style="display: inline-block; background-color: #FB9100; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 25px; font-size: 16px; font-weight: 600; box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1);">${linkText}</a>
              </div>
              <p style="font-size: 16px; line-height: 1.6; margin: 0; color: #000000; text-align: center;">${closing}</p>
            </td>
          </tr>
          <tr>
            <td style="background: linear-gradient(135deg, #000000, #1B5A96); padding: 20px; text-align: center; color: #ffffff;">
              <p style="margin: 0; font-size: 14px; opacity: 0.9;">© 2025 Adaired. All rights reserved.</p>
              <p style="margin: 10px 0 0; font-size: 12px;">
                <a href="https://adaired.com" style="color: #FB9100; text-decoration: none; margin: 0 10px;">Visit our website</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// Send new order notification to all admins
const admins = [process.env.DEVELOPER_EMAIL, process.env.CONTENT_MANAGER_EMAIL];

// Send order confirmation email to user
export const sendOrderConfirmationEmail = async (
  orderId: string
): Promise<void> => {
  try {
    const order = await Order.findById(orderId).populate("userId");
    if (!order || !order.userId) throw new Error("Order or user not found");

    const user = order.userId as any;
    const subject = `Your order has been placed successfully.`;
    const number = order.orderNumber;
    const type = "order" as const;
    const greeting = `Hello ${user.name},`;
    const date = new Date(order.createdAt).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "2-digit",
    });
    const totalAmount = `$${order.finalPrice.toFixed(2)}`;
    const paymentStatus = order.paymentStatus;
    const linkUrl =
      paymentStatus === "Unpaid"
        ? order.paymentUrl
        : `${process.env.BHW_DASHBOARD_URI}/orders?orderId${order.orderNumber}`;
    const linkText = paymentStatus === "Unpaid" ? "Pay Now" : "View Order";
    const closing = `Best Regards,<br>Team Adaired`;

    const html = emailTemplate(
      subject,
      number,
      type,
      greeting,
      date,
      totalAmount,
      paymentStatus,
      linkUrl,
      linkText,
      closing
    );
    await sendEmail(user.email, `${subject} - Order #${number}`, html);
  } catch (error) {
    console.error("Failed to send order confirmation email:", error);
  }
};

// Send payment confirmation email to user
export const sendPaymentConfirmationEmail = async (
  orderId: string
): Promise<void> => {
  try {
    const order = await Order.findById(orderId).populate("userId");
    if (!order || !order.userId) throw new Error("Order or user not found");

    const user = order.userId as any;
    const subject = `Payment done for order no. : ${order.orderNumber}`;
    const number = order.orderNumber;
    const type = "order" as const;
    const greeting = `Hello ${user.name},`;
    const date = new Date(order.createdAt).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "2-digit",
    });
    const totalAmount = `$${order.finalPrice.toFixed(2)}`;
    const paymentStatus = order.paymentStatus;
    const linkUrl = `${process.env.BHW_DASHBOARD_URI}/orders?orderId${order.orderNumber}`;
    const linkText = "View Order";
    const closing = `Best Regards,<br>Team Adaired`;

    const html = emailTemplate(
      subject,
      number,
      type,
      greeting,
      date,
      totalAmount,
      paymentStatus,
      linkUrl,
      linkText,
      closing
    );
    await sendEmail(user.email, `${subject} - Order #${number}`, html);
  } catch (error) {
    console.error("Failed to send payment confirmation email:", error);
  }
};

// Send new order notification to all admins
export const sendAdminNewOrderEmail = async (
  orderId: string
): Promise<void> => {
  try {
    const order = await Order.findById(orderId).populate("userId");
    if (!order || !order.userId) throw new Error("Order or user not found");
    const adminEmails = admins.filter((email): email is string => !!email);
    const subject = `New Order Placed`;
    const number = order.orderNumber;
    const type = "order" as const;
    const greeting = `Hello Admin Team,`;
    const date = new Date(order.createdAt).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "2-digit",
    });
    const totalAmount = `$${order.finalPrice.toFixed(2)}`;
    const paymentStatus = order.paymentStatus;
    const linkUrl = `${process.env.ADMIN_DASHBOARD_BASE_URI}/orders/order-details?orderNumber=${order.orderNumber}`;
    const linkText = "View Order";
    const closing = `Best Regards,<br>Team Adaired`;

    const html = emailTemplate(
      subject,
      number,
      type,
      greeting,
      date,
      totalAmount,
      paymentStatus,
      linkUrl,
      linkText,
      closing
    );
    await Promise.all(
      adminEmails.map((email) =>
        sendEmail(email, `${subject} - Order #${number}`, html)
      )
    );
  } catch (error) {
    console.error("Failed to send admin new order email:", error);
  }
};

// Send payment received notification to all admins
export const sendAdminPaymentReceivedEmail = async (
  orderId: string
): Promise<void> => {
  try {
    const order = await Order.findById(orderId).populate("userId");
    if (!order || !order.userId) throw new Error("Order or user not found");
    const adminEmails = admins.filter((email): email is string => !!email);
    const subject = `Payment Received`;
    const number = order.orderNumber;
    const type = "order" as const;
    const greeting = `Hello Admin Team,`;
    const date = new Date(order.createdAt).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "2-digit",
    });
    const totalAmount = `$${order.finalPrice.toFixed(2)}`;
    const paymentStatus = order.paymentStatus;
    const linkUrl = `${process.env.ADMIN_DASHBOARD_BASE_URI}/orders/order-details?orderNumber=${order.orderNumber}`;
    const linkText = "View Order";
    const closing = `Best Regards,<br>Team Adaired`;

    const html = emailTemplate(
      subject,
      number,
      type,
      greeting,
      date,
      totalAmount,
      paymentStatus,
      linkUrl,
      linkText,
      closing
    );
    await Promise.all(
      adminEmails.map((email) =>
        sendEmail(email, `${subject} - Order #${number}`, html)
      )
    );
  } catch (error) {
    console.error("Failed to send admin payment received email:", error);
  }
};

// Send invoice generated email to user
export const sendInvoiceGeneratedEmail = async (
  invoiceId: string
): Promise<void> => {
  try {
    const invoice = await Invoice.findById(invoiceId)
      .populate("userId")
      .populate("orderId");
    if (!invoice || !invoice.userId || !invoice.orderId)
      throw new Error("Invoice, user, or order not found");

    const user = invoice.userId as any;
    const order = invoice.orderId as any;
    const subject = `Your Invoice ${invoice.invoiceNumber} has been generated`;
    const number = invoice.invoiceNumber;
    const type = "invoice" as const;
    const greeting = `Hello ${user.name},`;
    const date = new Date(invoice.issuedDate).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "2-digit",
    });
    const totalAmount = `$${invoice.finalAmount.toFixed(2)}`;
    const paymentStatus = invoice.status;
    const linkUrl = `${process.env.BHW_DASHBOARD_URI}/invoices?invoiceNumber${invoice.invoiceNumber}`;
    const linkText = "View Invoice";
    const closing = `Best Regards,<br>Team Adaired`;

    const html = emailTemplate(
      subject,
      number,
      type,
      greeting,
      date,
      totalAmount,
      paymentStatus,
      linkUrl,
      linkText,
      closing
    );
    await sendEmail(user.email, `${subject} - Invoice #${number}`, html);
  } catch (error) {
    console.error("Failed to send invoice generated email:", error);
  }
};

// Send new invoice notification to all admins
export const sendAdminNewInvoiceEmail = async (
  invoiceId: string
): Promise<void> => {
  try {
    const invoice = await Invoice.findById(invoiceId)
      .populate("userId")
      .populate("orderId");
    if (!invoice || !invoice.userId || !invoice.orderId)
      throw new Error("Invoice, user, or order not found");

    const adminEmails = admins.filter((email): email is string => !!email);
    const user = invoice.userId as any;
    const order = invoice.orderId as any;
    const subject = `New Invoice Generated: ${invoice.invoiceNumber}`;
    const number = invoice.invoiceNumber;
    const type = "invoice" as const;
    const greeting = `Hello Admin Team,`;
    const date = new Date(invoice.issuedDate).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "2-digit",
    });
    const totalAmount = `$${invoice.finalAmount.toFixed(2)}`;
    const paymentStatus = invoice.status;
    const linkUrl = `${process.env.ADMIN_DASHBOARD_BASE_URI}/invoices?invoiceNumber=${invoice.invoiceNumber}`;
    const linkText = "View Invoice";
    const closing = `Best Regards,<br>Team Adaired`;

    const html = emailTemplate(
      subject,
      number,
      type,
      greeting,
      date,
      totalAmount,
      paymentStatus,
      linkUrl,
      linkText,
      closing
    );
    await Promise.all(
      adminEmails.map((email) =>
        sendEmail(email, `${subject} - Invoice #${number}`, html)
      )
    );
  } catch (error) {
    console.error("Failed to send admin new invoice email:", error);
  }
};


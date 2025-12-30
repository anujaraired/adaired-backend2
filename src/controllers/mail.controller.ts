import { Request, Response } from "express";
import nodemailer from "nodemailer";

export const sendMail = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, message, formId } = req.body;

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
      // tls: {
      //   rejectUnauthorized: false,
      // },
    });

    await transporter.sendMail({
      from: `"New Inquiry" <${process.env.MAIL_USER}>`,
      to: ["dheeraj@adaired.com", "sahil@adaired.com", "anuj@adaired.org"],

      subject: `New Inquiry - ${formId ?? ""}`,
      html: `
    <div style="font-family: Arial, sans-serif; background:#f9fafb; padding:20px;">
      <div style="max-width:600px; margin:auto; background:#ffffff; border-radius:6px; padding:20px;">

        <h2 style="margin-top:0; color:#1B5A96;">📩 New Inquiry Received</h2>

        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0; font-weight:bold;">Name</td>
            <td style="padding:8px 0;">${name}</td>
          </tr>
          <tr>
            <td style="padding:8px 0; font-weight:bold;">Email</td>
            <td style="padding:8px 0;">${email}</td>
          </tr>
          <tr>
            <td style="padding:8px 0; font-weight:bold;">Phone</td>
            <td style="padding:8px 0;">${phone || "-"}</td>
          </tr>
          <tr>
            <td style="padding:8px 0; font-weight:bold; vertical-align:top;">Message</td>
            <td style="padding:8px 0;">${message || "-"}</td>
          </tr>
        </table>

        <hr style="margin:20px 0; border:none; border-top:1px solid #eee;" />

        <p style="font-size:12px; color:#666;">
          Form ID: <b>${formId ?? "N/A"}</b><br />
          Received on: ${new Date().toLocaleString()}
        </p>

      </div>
    </div>
  `,
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

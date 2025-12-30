import { Request, Response } from "express";
import nodemailer from "nodemailer";

export const sendMail = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, message, formId } = req.body;

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
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
      // to: ["dheeraj@adaired.com", "sahil@adaired.com", "anuj@adaired.org"],
      to: ["anuj@adaired.org"],

      subject: `New Inquiry - ${formId}`,
      html: `
        <h3>New Inquiry</h3>
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Phone:</b> ${phone}</p>
        <p><b>Message:</b> ${message}</p>
      `,
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

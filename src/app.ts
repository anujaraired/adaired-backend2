import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";

import multerRoute from "./routes/multer.routes";
import auth_routes from "./routes/auth.routes";
import user_routes from "./routes/user.routes";
import role_routes from "./routes/role.routes";
import permission_module_routes from "./routes/permission-module.routes";
import blog_routes from "./routes/blog.routes";
import blog_category_routes from "./routes/blog-category.routes";
import case_study_routes from "./routes/case-study.routes";
import case_study_category_routes from "./routes/case-study-category.routes";
import serviceRoute from "./routes/service.routes";
import productRoute from "./routes/product.routes";
import productFormRoute from "./routes/form.routes";
import productCategoryRoute from "./routes/product-category.routes";
import cartRoute from "./routes/cart.routes";
import orderRoute from "./routes/order.routes";
import couponRoute from "./routes/coupon.routes";
import ticketRoutes from "./routes/ticket.routes";
import invoiceRoutes from "./routes/invoices.routes";
import pageSEORoute from "./routes/static-pages-seo.routes";
import mailRoute from "./routes/mail.routes";
dotenv.config();

const app: Application = express();
const basePath = "/api/v2";

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.send("Server running 🚀");
});

app.use(`${basePath}/multer`, multerRoute);
app.use(`${basePath}/auth`, auth_routes);
app.use(`${basePath}/user`, user_routes);
app.use(`${basePath}/role`, role_routes);
app.use(`${basePath}/permission-module`, permission_module_routes);
app.use(`${basePath}/blog`, blog_routes);
app.use(`${basePath}/blog-category`, blog_category_routes);
app.use(`${basePath}/case-study`, case_study_routes);
app.use(`${basePath}/case-study/category`, case_study_category_routes);
app.use(`${basePath}/service`, serviceRoute);
app.use(`${basePath}/product`, productRoute);
app.use(`${basePath}/product/form`, productFormRoute);
app.use(`${basePath}/product/category`, productCategoryRoute);
app.use(`${basePath}/cart`, cartRoute);
app.use(`${basePath}/orders`, orderRoute);
app.use(`${basePath}/coupons`, couponRoute);
app.use(`${basePath}/tickets`, ticketRoutes);
app.use(`${basePath}/invoices`, invoiceRoutes);
app.use(`${basePath}/page-seo`, pageSEORoute);
app.use(`${basePath}/mail`, mailRoute);

export default app;

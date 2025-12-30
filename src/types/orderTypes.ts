import { Types } from "mongoose";
import { CartProduct } from "./cartTypes";

// Define the main Order type
export interface OrderTypes extends Document {
  userId: Types.ObjectId;
  orderNumber?: string;
  products: CartProduct[];
  totalQuantity: number;
  totalPrice: number;
  couponDiscount: number;
  finalPrice: number;
  couponId?: Types.ObjectId | null;
  paymentId: string;
  invoiceId: string;
  zohoInvoiceId: string;
  paymentUrl: string;
  status:
    | "Pending"
    | "Processing"
    | "Confirmed"
    | "Cancelled"
    | "Completed"
  paymentStatus: "Unpaid" | "Paid" | "Refunded" | "Failed";
  paymentMethod: "Razorpay" | "Stripe";
  paymentDate: Date;
  createdAt?: Date;
  updatedAt?: Date;
}



export interface RawChartDataItem {
  dayNumber: number;
  newOrders: number;
  sales: number;
  revenue: number;
}

export interface ChartDataItem {
  day: string; 
  value: number;
}
export interface OrderStatsResponse {
  newOrders: { count: number; percentageChange: number; trend: string };
  sales: { total: number; percentageChange: number; trend: string };
  revenue: { total: number; percentageChange: number; trend: string };
  allOrders: number;
  paidOrders: number;
  dailyOrders: number;
  completedOrders: number;
  chartData: {
    newOrders: ChartDataItem[];
    sales: ChartDataItem[];
    revenue: ChartDataItem[];
  };
}
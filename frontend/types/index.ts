export type Role = 'ADMIN' | 'MOTHER' | 'DELIVERY' | 'CUSTOMER';

export interface User {
  id: string;
  name: string;
  phone: string;
  role: Role;
}

export interface Product {
  id: string;
  name: string;
  photoUrl: string | null;
  retailStock: number;
  wholesaleUnitQty: number;
  unit: string;
  price: number;
  createdAt?: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  price: number;
  isPacked?: boolean;
}

export interface Order {
  id: string;
  customerId: string | null;
  customer: User | null;
  deliveryBoyId: string | null;
  deliveryBoy: User | null;
  status: 'PENDING' | 'ACCEPTED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
  otp: string | null;
  totalAmount: number;
  deviceTrackingId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  address: string | null;
  pincode: string | null;
  items: OrderItem[];
  createdAt: string;
}

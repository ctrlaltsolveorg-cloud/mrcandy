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
}

export interface OrderItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  customerId: string;
  customer: User;
  deliveryBoyId: string | null;
  deliveryBoy: User | null;
  status: 'PENDING' | 'ACCEPTED' | 'DELIVERED' | 'CANCELLED';
  otp: string | null;
  totalAmount: number;
  items: OrderItem[];
  createdAt: string;
}

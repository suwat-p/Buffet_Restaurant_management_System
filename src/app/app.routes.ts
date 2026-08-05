import { Routes } from '@angular/router';
import { Cart } from './cart/cart';
import { CustomerOrder } from './customer-order/customer-order';
import { BillingList } from './features/cashier-employee/bill/bill';
import { CheckOut } from './features/cashier-employee/check-out/check-out';
import { DisplayCheckout } from './features/cashier-employee/display-checkout/display-checkout';
import { Receipt } from './features/cashier-employee/receipt/receipt';
import { LoginEmployee } from './features/login-employee/login-employee';
import { LoginMember } from './features/login-member/login-member';
import { Dashboard } from './features/manager/dashboard/dashboard';
import { DetailEmployee } from './features/manager/detail-employee/detail-employee';
import { ApproveEmployee } from './features/manager/manage-employee/approve-employee/approve-employee';
import { EmployeeIncome } from './features/manager/manage-employee/employee-income/employee-income';
import { ManageEmployee } from './features/manager/manage-employee/manage-employee';
import { ManageMenu } from './features/manager/manage-menu/manage-menu';
import { ManageDiscount } from './features/manager/manage-shop/manage-discount/manage-discount';
import { ManageShop } from './features/manager/manage-shop/manage-shop';
import { ManageShopLocation } from './features/manager/manage-shop/manage-shop-location/manage-shop-location';
import { EditDeleteTables } from './features/manager/manage-tables/edit-delete-tables/edit-delete-tables';
import { ManageTables } from './features/manager/manage-tables/manage-tables';
import { BookingStatus } from './features/member/booking-status/booking-status';
import { Booking } from './features/member/booking/booking';
import { RegisterEmployee } from './features/register-employee/register-employee';
import { RegisterMember } from './features/register-member/register-member';
import { ConfrimCheckin } from './features/server-employee/confrim-checkin/confrim-checkin';
import { CreateBill } from './features/server-employee/create-bill/create-bill';
import { EmployeeAttendance } from './features/server-employee/employee-checkin/employee-attendance';
import { employeeGuard } from './guards/employee-guard';
import { memberGuard } from './guards/member-guard';
import { Index } from './index';
import { StatusCustomerOrder } from './status/status-customer-order/status-customer-order';
import { KitchenDashboard } from './features/kitchen-dashboard/kitchen-dashboard';

export const routes: Routes = [
  { path: '', component: Index },
  { path: 'Registeremployee', component: RegisterEmployee },
  { path: 'Registermember', component: RegisterMember },
  { path: 'Loginmember', component: LoginMember },
  { path: 'Loginemployee', component: LoginEmployee },
  {
    path: 'Dashboard',
    component: Dashboard,
    canActivate: [employeeGuard],
    data: { roles: ['เจ้าของร้าน'] },
  },
  { path: 'Booking', component: Booking, canActivate: [memberGuard], data: { role: ['Member'] } },
  { path: 'BookingStatus', component: BookingStatus },

  { path: 'Customer', component: CustomerOrder },
  { path: 'Cart', component: Cart },
  { path: 'StatusCustomer', component: StatusCustomerOrder },
  { path: 'Employeecheckin', component: EmployeeAttendance },
  { path: 'EmployeeIncome', component: EmployeeIncome },
  { path: 'KitchenDashboard', component: KitchenDashboard },

  {
    path: 'ManageEmployee',
    component: ManageEmployee,
    canActivate: [employeeGuard],
    data: { roles: ['เจ้าของร้าน'] },
  },
  {
    path: 'ApproveEmployee',
    component: ApproveEmployee,
    canActivate: [employeeGuard],
    data: { roles: ['เจ้าของร้าน'] },
  },
  {
    path: 'ManageTable',
    component: ManageTables,
    canActivate: [employeeGuard],
    data: { route: ['เจ้าของร้าน'] },
  },
  {
    path: 'EditDeleteTable',
    component: EditDeleteTables,
    canActivate: [employeeGuard],
    data: { route: ['เจ้าของร้าน'] },
  },
  {
    path: 'DetailEmployee/:id',
    component: DetailEmployee,
    canActivate: [employeeGuard],
    data: { route: ['เจ้าของร้าน'] },
  },

  {
    path: 'ManageMenu',
    component: ManageMenu,
    canActivate: [employeeGuard],
    data: { roles: ['เจ้าของร้าน'] },
  },
  {
    path: 'ManageShop',
    component: ManageShop,
    canActivate: [employeeGuard],
    data: { roles: ['เจ้าของร้าน'] },
  },

  {
    path: 'ManageShopLocation',
    component: ManageShopLocation,
    canActivate: [employeeGuard],
    data: { roles: ['เจ้าของร้าน'] },
  },
  {
    path: 'ManageDiscount',
    component: ManageDiscount,
    canActivate: [employeeGuard],
    data: { roles: ['เจ้าของร้าน'] },
  },

  {
    path: 'CreateBill',
    component: CreateBill,
    canActivate: [employeeGuard],
    data: { roles: ['พนักงานเสิร์ฟ'] },
  },
  {
    path: 'ConfirmCheckin',
    component: ConfrimCheckin,
    canActivate: [employeeGuard],
    data: { roles: ['พนักงานเสิร์ฟ'] },
  },
  {
    path: 'BillingList',
    component: BillingList,
    canActivate: [employeeGuard],
    data: { roles: ['พนักงานแคชเชียร์'] },
  },
  {
    path: 'CheckOut/:billId',
    component: CheckOut,
    canActivate: [employeeGuard],
    data: { roles: ['พนักงานแคชเชียร์'] },
  },
  {
    path: 'Receipt',
    component: Receipt,
    canActivate: [employeeGuard],
    data: { roles: ['พนักงานแคชเชียร์'] },
  },
  {
    path: 'display-checkout',
    component: DisplayCheckout,
  },

  { path: '**', redirectTo: '' },
];

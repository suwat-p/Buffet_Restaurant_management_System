export interface Bill {
    bill_id: number;
    booking_id: number;
    config_id: number;
    emp_id: number;
    discount_id: number | null;
    created_at: Date | string;
    closed_at?: Date | string | null;
    numAdults: number;
    numChildren: number;
    fine: number;
    total_amount: number;
    paymentMethod?: string | null;
    tableNumbers?: string;
    allTables?: any[];
}

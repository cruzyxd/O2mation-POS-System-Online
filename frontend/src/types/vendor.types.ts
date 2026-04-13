export type VendorStatus = "Active" | "Archived";

export interface Vendor {
    id: string;
    name: string;
    normalizedName: string;
    phone: string | null;
    notes: string | null;
    status: VendorStatus;
    createdAt: string;
    updatedAt: string;
}

export interface CreateVendorParams {
    name: string;
    phone?: string;
    notes?: string;
}

export interface UpdateVendorParams {
    name: string;
    phone?: string;
    notes?: string;
}

export interface VendorOperationResult<T = unknown> {
    success: boolean;
    message?: string;
    data?: T;
}

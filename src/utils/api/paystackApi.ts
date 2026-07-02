import BaseApi from "./baseApi";

const baseUrl = process.env.PAYSTACK_BASEURL || "";
const secretKey = process.env.PAYSTACK_SECRET_KEY || "";



export interface InitializePaymentArgs {
    email: string;
    amount: number;
    callback_url?: string;
    metadata?:{
        amount: number;
        email: string;
        name: string;
        bookingId: string
    }    
}

interface InitializePaymentResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}
 
export interface VerifyPaymentResponse {
  status: boolean;
  message: string;
  data: {
    reference: string;
    amount: number;
    status: string;
    metadata?: {
      amount: number;
      email: string;
      name: string;
    };
  };
}

class PaystackApi extends BaseApi {
  constructor() {
    super(baseUrl);
  }

  async initializePayment(paymentData: InitializePaymentArgs) {
    return this.post<InitializePaymentResponse>(
      "/transaction/initialize",
      paymentData,
      undefined,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      },
    );
  }

  async verifyPayment(reference:string) {
    return this.get<VerifyPaymentResponse>(`/transaction/verify/${reference}`, undefined, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    });
  }
}

const paystackApi = new PaystackApi()

export default paystackApi;
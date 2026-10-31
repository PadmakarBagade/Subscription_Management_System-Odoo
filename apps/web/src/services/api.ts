export const API_BASE = '/api/v1';

export class ApiError extends Error {
  public statusCode: number;
  public errors?: Record<string, string[]>;

  constructor(message: string, statusCode: number = 400, errors?: Record<string, string[]>) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('brightloop_token');

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // Include HTTP-only cookies
  });

  // Handle PDF or blob downloads
  const contentType = response.headers.get('Content-Type') || '';
  if (contentType.includes('application/pdf')) {
    const blob = await response.blob();
    return blob as any;
  }

  let data: any;
  try {
    data = await response.json();
  } catch {
    data = { error: 'Invalid JSON response from server' };
  }

  if (!response.ok || data.success === false) {
    throw new ApiError(
      data.error || data.message || 'API request failed',
      response.status,
      data.errors
    );
  }

  return data;
}

/**
 * Downloads a PDF from an endpoint and opens or saves it in the browser.
 */
export async function downloadPdf(endpoint: string, defaultFilename: string) {
  const token = localStorage.getItem('brightloop_token');
  const headers: HeadersInit = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to generate PDF');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = defaultFilename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Launches the official Razorpay Checkout modal in the browser.
 */
export function openRazorpayCheckout(params: {
  keyId: string;
  orderId: string;
  amountInPaise: number;
  currency: string;
  name: string;
  description: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  onSuccess: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  onDismiss?: () => void;
}) {
  const win = window as any;
  if (!win.Razorpay) {
    alert('Razorpay Checkout SDK is loading or unavailable. Please check your connection.');
    return;
  }

  const options = {
    key: params.keyId,
    amount: params.amountInPaise,
    currency: params.currency || 'INR',
    name: 'Brightloop Software',
    description: params.description,
    order_id: params.orderId,
    prefill: {
      name: params.customerName || '',
      email: params.customerEmail || '',
      contact: params.customerPhone || '',
    },
    theme: {
      color: '#4f46e5',
    },
    handler: function (response: any) {
      params.onSuccess(response);
    },
    modal: {
      ondismiss: function () {
        if (params.onDismiss) params.onDismiss();
      },
    },
  };

  const rzp = new win.Razorpay(options);
  rzp.open();
}

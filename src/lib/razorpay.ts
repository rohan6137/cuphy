declare global {
  interface Window {
    Razorpay: any;
  }
}

type StartRazorpayPaymentParams = {
  createOrderUrl: string;
  verifyPaymentUrl: string;
  batch: any;
  user: any;
  onSuccess?: () => void;
};

export async function startRazorpayPayment({
  createOrderUrl,
  verifyPaymentUrl,
  batch,
  user,
  onSuccess,
}: StartRazorpayPaymentParams) {
  const createOrderRes = await fetch(createOrderUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      batchId: batch.id,
      batchName: batch.batchName || batch.name || "",
      semester: batch.semester || "",
      amount: Number(batch.price || 0),
      userUid: user.uid || "",
      userPhone: user.phone || "",
      userEmail: user.email || "",
      userName: user.fullName || user.name || "",
    }),
  });

  const createOrderData = await createOrderRes.json();

  if (!createOrderData?.success) {
    throw new Error(createOrderData?.message || "Unable to create order");
  }

  const options = {
    key: createOrderData.key,
    amount: createOrderData.order.amount,
    currency: createOrderData.order.currency,
    name: "CUPHY",
    description: `Premium access for ${batch.batchName || batch.name || "Batch"}`,
    order_id: createOrderData.order.id,
    handler: async function (response: any) {
      const verifyRes = await fetch(verifyPaymentUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          batchId: batch.id,
          batchName: batch.batchName || batch.name || "",
          semester: batch.semester || "",
          amount: Number(batch.price || 0),
          userUid: user.uid || "",
          userPhone: user.phone || "",
          userEmail: user.email || "",
          userName: user.fullName || user.name || "",
        }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyData?.success) {
        throw new Error(verifyData?.message || "Payment verification failed");
      }

      onSuccess?.();
    },
    prefill: {
      name: user.name || "",
      email: user.email || "",
      contact: (user.phone || "").replace("+", ""),
    },
    theme: {
      color: "#2563eb",
    },
    modal: {
      ondismiss: function () {
        console.log("Razorpay checkout closed");
      },
    },
  };

  const razorpay = new window.Razorpay(options);
  razorpay.open();
}
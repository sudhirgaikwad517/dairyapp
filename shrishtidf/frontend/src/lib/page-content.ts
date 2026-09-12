export type FaqItem = { question: string; answer: string };

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: "What is A2 milk?",
    answer:
      "A2 milk comes from Gir cows that naturally produce milk with A2 beta-casein protein, which many people find easier to digest than regular A1 milk.",
  },
  {
    question: "Do you deliver in Akurdi and nearby areas?",
    answer:
      "Yes. We deliver fresh milk daily across Akurdi, Pimpri-Chinchwad, and select Pune neighbourhoods. Contact us to confirm your pin code.",
  },
  {
    question: "What is the difference between buy once and subscription?",
    answer:
      "Buy once is a single delivery at the listed price. Subscription is a 30-day plan with discounted rates on eligible products, billed monthly.",
  },
  {
    question: "How fresh is the milk?",
    answer:
      "Milk is hygienically collected from our farm, quality-checked, packed, and delivered the same day or next morning depending on your slot.",
  },
  {
    question: "Can I pause or cancel my subscription?",
    answer:
      "Yes. You can pause or cancel before the next billing cycle by calling us or through the Help page. See our Refund & Cancellation policy for details.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept UPI, cards, net banking, and wallets via Razorpay. Cash on delivery may be available in select areas — call us to confirm.",
  },
  {
    question: "Is your milk FSSAI certified?",
    answer: "Yes. Shrishti Dairy Farm is FSSAI licensed (FSSAI 21524003000030).",
  },
];

export const TRIAL_PACKS = [
  {
    title: "A2 Milk Trial — 3 Days",
    desc: "Try our pure A2 Gir cow milk for three mornings. Half litre per day.",
    price: "₹138",
    note: "₹46/day · delivery included in Akurdi",
  },
  {
    title: "Buffalo Milk Trial — 3 Days",
    desc: "Rich, creamy buffalo milk trial pack. Half litre per day for 3 days.",
    price: "₹138",
    note: "₹46/day",
  },
  {
    title: "High Protein Sampler",
    desc: "One Plain + one Coffee High Protein bottle to taste both varieties.",
    price: "₹175",
    note: "Save ₹5 vs buying separately",
  },
];

export const COMBO_OFFERS = [
  {
    title: "Family A2 Combo",
    desc: "A2 Milk 1L × 7 days + weekend half-litre bonus.",
    price: "₹620",
    save: "Save ₹10",
  },
  {
    title: "Protein Power Pack",
    desc: "Plain High Protein × 4 + Coffee High Protein × 4 (weekly).",
    price: "₹660",
    save: "Save ₹40",
  },
  {
    title: "Mixed Milk Monthly",
    desc: "A2 1L + Buffalo 1L alternating days for 15 days each.",
    price: "₹1,350",
    save: "Best for variety lovers",
  },
];

export const BLOG_POSTS = [
  {
    slug: "a2-ghee-usages-and-benefits",
    title: "A2 Ghee Usages And Benefits",
    date: "2026-01-12",
    excerpt:
      "In daily life, we eat many such things which provide nutrients for the body — protein, vitamins, calcium, and potassium. But not all essential elements are present in every food.",
  },
  {
    slug: "a2-cow-ghee-healthier-than-regular",
    title: "A2 cow ghee — Is it healthier than regular ghee?",
    date: "2025-12-08",
    excerpt:
      "Everyone knows that consuming ghee is beneficial for health. Ghee is used in very large quantities in India. This question is very important: is A2 Desi Ghee healthier?",
  },
  {
    slug: "a2-milk-important-for-babies",
    title: "How A2 milk is important for babies?",
    date: "2025-11-20",
    excerpt:
      "Cow's milk is given utmost importance in India. Cow is also called Kamdhenu. Cow's milk is best for babies — cow is also called mother. Considered to be of the best category.",
  },
  {
    slug: "how-much-milk-for-toddlers",
    title: "How much milk you should give to toddlers?",
    date: "2025-10-15",
    excerpt:
      "Many people wonder how much milk should be given to a toddler. It depends not only on their body but also on their age.",
  },
  {
    slug: "a2-cow-milk-and-benefits",
    title: "A2 Cow Milk and its benefits",
    date: "2025-09-22",
    excerpt:
      "A2 milk is very beneficial — it can reduce swelling and irritation. This milk proves very beneficial to the digestive system.",
  },
  {
    slug: "top-5-reasons-a2-milk",
    title: "Top 5 reasons to consume A2 milk",
    date: "2025-08-30",
    excerpt:
      "A2 milk offers several advantages over conventional milk for families seeking a healthier daily dairy option.",
  },
  {
    slug: "why-a2-milk-only-type",
    title: "Why A2 Milk is the only type of milk you should be drinking?",
    date: "2025-07-18",
    excerpt:
      "Unlike conventional milk, A2 milk contains A2 beta-casein protein, which proponents claim offers several health advantages.",
  },
];

export const HELP_TOPICS = [
  {
    title: "Placing an order",
    body: "Browse Products, add items to cart, and checkout with your name, phone, and delivery address. You will receive an order ID on confirmation.",
  },
  {
    title: "Subscriptions",
    body: "Choose subscription pricing on product cards or visit the Subscription page. Plans run for 30 days and renew unless paused.",
  },
  {
    title: "Delivery timings",
    body: "Morning delivery slots are typically 6 AM – 9 AM in Akurdi and nearby areas. We will call to confirm your first delivery.",
  },
  {
    title: "Order issues",
    body: "For missing items, quality concerns, or delivery delays, call us or use the Contact page. We aim to resolve issues within 24 hours.",
  },
];

export const PRIVACY_POLICY = `
Shrishti Dairy Farm ("we", "us") respects your privacy. This policy explains how we collect and use your information when you use our website or place an order.

**Information we collect:** Name, phone number, delivery address, order history, and payment references processed securely via Razorpay. We do not store full card details on our servers.

**How we use it:** To fulfil orders, manage subscriptions, send delivery updates, improve our service, and comply with legal obligations.

**Sharing:** We share data only with delivery partners and payment processors as needed to complete your order. We do not sell your personal data.

**Cookies:** We use session cookies to maintain your cart. You can disable cookies in your browser, but cart features may not work.

**Your rights:** You may request access, correction, or deletion of your data by contacting us.

**Contact:** Use the phone numbers or address on our Contact page for privacy-related requests.
`.trim();

export const TERMS_CONDITIONS = `
By using the Shrishti Dairy Farm website and placing orders, you agree to these terms.

**Products:** We sell fresh dairy products including A2 milk, buffalo milk, and high protein milk. Prices are listed in INR and may change with notice.

**Orders:** An order is confirmed when you receive an order ID. We reserve the right to refuse or cancel orders in case of stock unavailability or service area limits.

**Subscriptions:** 30-day subscription plans auto-renew unless cancelled before the next cycle. Pricing is as shown at checkout.

**Delivery:** We deliver to serviceable areas around Akurdi, Pune. Delivery windows are estimates, not guarantees.

**Liability:** Fresh dairy is perishable. Consume within recommended timeframes. We are not liable for improper storage after delivery.

**Governing law:** These terms are governed by the laws of India. Disputes are subject to Pune jurisdiction.
`.trim();

export const REFUND_POLICY = `
**Cancellations:** Orders can be cancelled before dispatch by calling us. Once milk is packed for delivery, cancellation may not be possible.

**Subscriptions:** Cancel or pause at least 24 hours before your next billing date. Partial refunds for unused subscription days are at our discretion.

**Quality issues:** If you receive spoiled or incorrect products, contact us within 12 hours with details. We will replace the item or issue a refund/credit.

**Payment failures:** If payment fails but an order was created, the order will not be processed until payment succeeds.

**Refunds:** Approved refunds are processed to the original payment method within 5–7 business days via Razorpay.
`.trim();

export const SHIPPING_POLICY = `
**Service area:** We currently deliver in Akurdi, Pimpri-Chinchwad, and select Pune neighbourhoods. Enter your address at checkout — we will confirm serviceability.

**Delivery schedule:** Daily morning delivery for milk subscriptions. One-time orders are scheduled within 24–48 hours where possible.

**Fees:** Delivery is free on subscriptions in Akurdi. One-time orders may incur a nominal delivery fee for distant pin codes — we will inform you before confirming.

**Receiving delivery:** Please ensure someone is available to receive perishable items. We are not responsible for spoilage if delivery cannot be completed due to incorrect address or unavailability.

**Holidays:** Delivery may be adjusted on public holidays. Subscribers will be notified in advance.
`.trim();

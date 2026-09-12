import prisma from './db/prisma';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { customerCodeService } from './services/CustomerCodeService';

function uuid() {
  return crypto.randomUUID();
}

function img(seed: string) {
  return `https://picsum.photos/seed/${seed}/600/400`;
}

async function clean() {
  console.log('Cleaning existing data (admin_users preserved)...');
  await prisma.delivery_records.deleteMany({});
  await prisma.app_banners.deleteMany({});
  await prisma.activity_logs.deleteMany({});
  await prisma.customer_feedback.deleteMany({});
  await prisma.wastage_logs.deleteMany({});
  await prisma.customers.updateMany({ data: { hub_id: null, route_id: null, delivery_boy_id: null } });
  await prisma.delivery_routes.updateMany({ data: { driver_id: null, hub_id: null } });
  await prisma.delivery_boys.updateMany({ data: { hub_id: null } });
  await prisma.delivery_boys.deleteMany({});
  await prisma.hubs.deleteMany({});
  await prisma.inventory_batches.deleteMany({});
  await prisma.order_items.deleteMany({});
  await prisma.cart_items.deleteMany({});
  await prisma.product_cross_sells.deleteMany({});
  await prisma.product_reviews.deleteMany({});
  await prisma.wallet_transactions.deleteMany({});
  await prisma.referrals.deleteMany({});
  await prisma.subscriptions.deleteMany({});
  await prisma.orders.deleteMany({});
  await prisma.customer_wallets.deleteMany({});
  await prisma.carts.deleteMany({});
  await prisma.product_variants.deleteMany({});
  await prisma.products.deleteMany({});
  await prisma.product_sub_categories.deleteMany({});
  await prisma.product_categories.deleteMany({});
  await prisma.delivery_slots.deleteMany({});
  await prisma.delivery_zones.deleteMany({});
  await prisma.apartments.deleteMany({});
  await prisma.sub_areas.deleteMany({});
  await prisma.delivery_areas.deleteMany({});
  await prisma.delivery_routes.deleteMany({});
  await prisma.customers.deleteMany({});
  await prisma.leads.deleteMany({});
  await prisma.office_staff.deleteMany({});
  await prisma.staff_types.deleteMany({});
  await prisma.delivery_modes.deleteMany({});
  await prisma.delivery_charge_tiers.deleteMany({});
  await prisma.cancel_reasons.deleteMany({});
  console.log('Clean done.');
}

async function seed() {
  console.log('Seeding fresh sample/testing data...');
  const now = new Date();

  // ---- Product categories ----
  const categories = [
    { id: 'cat_milk', label: 'Milk', tile: 'var(--tile-1)', image_url: img('dairy-milk'), description: 'Farm-fresh cow and buffalo milk, delivered daily.' },
    { id: 'cat_ghee', label: 'Ghee', tile: 'var(--tile-2)', image_url: img('dairy-ghee'), description: 'Pure, traditionally prepared desi ghee.' },
    { id: 'cat_paneer_curd', label: 'Paneer & Curd', tile: 'var(--tile-3)', image_url: img('dairy-paneer'), description: 'Fresh paneer and thick, creamy curd.' },
  ];
  for (const [i, c] of categories.entries()) {
    await prisma.product_categories.create({
      data: { ...c, is_active: true, sort_order: i, created_at: now, updated_at: now },
    });
  }

  // ---- Product sub-categories ----
  const subMilkCow = 'sub_milk_cow';
  const subMilkBuffalo = 'sub_milk_buffalo';
  const subGheeCow = 'sub_ghee_cow';
  const subGheeBuffalo = 'sub_ghee_buffalo';
  const subPaneer = 'sub_paneer';
  const subCurd = 'sub_curd';
  await prisma.product_sub_categories.createMany({
    data: [
      { id: subMilkCow, category_id: 'cat_milk', label: 'Cow Milk', sort_order: 0, is_active: true, created_at: now, updated_at: now },
      { id: subMilkBuffalo, category_id: 'cat_milk', label: 'Buffalo Milk', sort_order: 1, is_active: true, created_at: now, updated_at: now },
      { id: subGheeCow, category_id: 'cat_ghee', label: 'Cow Ghee', sort_order: 0, is_active: true, created_at: now, updated_at: now },
      { id: subGheeBuffalo, category_id: 'cat_ghee', label: 'Buffalo Ghee', sort_order: 1, is_active: true, created_at: now, updated_at: now },
      { id: subPaneer, category_id: 'cat_paneer_curd', label: 'Paneer', sort_order: 0, is_active: true, created_at: now, updated_at: now },
      { id: subCurd, category_id: 'cat_paneer_curd', label: 'Curd', sort_order: 1, is_active: true, created_at: now, updated_at: now },
    ],
  });

  // ---- Products (each with 1-2 city-scoped "Product Details" variants) ----
  const products = [
    {
      id: 'prod_cow_milk_1l', categoryId: 'cat_milk', subCategoryId: subMilkCow, name: 'Cow Milk',
      shortCode: 'CM1L', discount: 0, hsnCode: '0401', productType: 'Liquid', badge: 'POPULAR', img: img('cow-milk'),
      variants: [
        { city: 'Pune', packaging: '1L', ltrs: 1, packets: 1, rate: 60, mrpEcom: 65, bottleApplicable: true, pouchApplicable: false },
        { city: 'Mumbai', packaging: '1L', ltrs: 1, packets: 1, rate: 62, mrpEcom: 68, bottleApplicable: true, pouchApplicable: false },
      ],
    },
    {
      id: 'prod_buffalo_milk_1l', categoryId: 'cat_milk', subCategoryId: subMilkBuffalo, name: 'Buffalo Milk',
      shortCode: 'BM1L', discount: 0, hsnCode: '0401', productType: 'Liquid', badge: 'NEW', img: img('buffalo-milk'),
      variants: [
        { city: 'Pune', packaging: '1L', ltrs: 1, packets: 1, rate: 70, mrpEcom: 75, bottleApplicable: true, pouchApplicable: false },
      ],
    },
    {
      id: 'prod_a2_ghee_500g', categoryId: 'cat_ghee', subCategoryId: subGheeCow, name: 'A2 Cow Ghee',
      shortCode: 'A2G500', discount: 20, hsnCode: '0405', productType: 'Other', badge: 'BEST VALUE', img: img('a2-ghee'),
      variants: [
        { city: 'Pune', packaging: '500g', ltrs: 0.5, packets: 1, rate: 550, mrpEcom: 590, bottleApplicable: false, pouchApplicable: true },
        { city: 'Mumbai', packaging: '500g', ltrs: 0.5, packets: 1, rate: 560, mrpEcom: 600, bottleApplicable: false, pouchApplicable: true },
      ],
    },
    {
      id: 'prod_buffalo_ghee_500g', categoryId: 'cat_ghee', subCategoryId: subGheeBuffalo, name: 'Buffalo Ghee',
      shortCode: 'BG500', discount: 0, hsnCode: '0405', productType: 'Other', badge: '', img: img('buffalo-ghee'),
      variants: [
        { city: 'Pune', packaging: '500g', ltrs: 0.5, packets: 1, rate: 600, mrpEcom: 640, bottleApplicable: false, pouchApplicable: true },
      ],
    },
    {
      id: 'prod_fresh_paneer_200g', categoryId: 'cat_paneer_curd', subCategoryId: subPaneer, name: 'Fresh Paneer',
      shortCode: 'FP200', discount: 0, hsnCode: '0406', productType: 'Other', badge: 'SEASONAL', img: img('fresh-paneer'),
      variants: [
        { city: 'Pune', packaging: '200g', ltrs: 0, packets: 1, rate: 90, mrpEcom: 95, bottleApplicable: false, pouchApplicable: true },
      ],
    },
    {
      id: 'prod_curd_400g', categoryId: 'cat_paneer_curd', subCategoryId: subCurd, name: 'Curd',
      shortCode: 'CRD400', discount: 0, hsnCode: '0403', productType: 'Other', badge: 'NEW', img: img('curd'),
      variants: [
        { city: 'Pune', packaging: '400g', ltrs: 0.4, packets: 1, rate: 40, mrpEcom: 45, bottleApplicable: false, pouchApplicable: true },
      ],
    },
  ];

  const variantIds: Record<string, string> = {};
  for (const [i, p] of products.entries()) {
    const first = p.variants[0];
    await prisma.products.create({
      data: {
        id: p.id,
        category_id: p.categoryId,
        sub_category_id: p.subCategoryId,
        product_type: p.productType,
        name: p.name,
        short_code: p.shortCode,
        discount: p.discount,
        hsn_code: p.hsnCode,
        size: first.packaging,
        buy_once: first.rate,
        subscription: first.rate,
        badge: p.badge || null,
        image_url: p.img,
        description: `${p.name} (${first.packaging}) — fresh, testing sample data.`,
        sort_order: i,
        stock_quantity: 100,
        is_active: true,
        gst_rate: 0,
        created_at: now,
        updated_at: now,
      },
    });

    for (const [vi, v] of p.variants.entries()) {
      const variantId = uuid();
      if (vi === 0) variantIds[p.id] = variantId;
      await prisma.product_variants.create({
        data: {
          id: variantId,
          product_id: p.id,
          sku: `${p.id}-${v.city}`.toUpperCase(),
          size_label: v.packaging,
          city: v.city,
          packets: v.packets,
          ltrs: v.ltrs,
          buy_once: v.rate,
          subscription: v.rate,
          mrp_ecom: v.mrpEcom,
          bottle_applicable: v.bottleApplicable,
          pouch_applicable: v.pouchApplicable,
          out_of_stock: false,
          web_visibility: true,
          app_visibility: true,
          is_default: vi === 0,
          stock_quantity: 100,
          sort_order: vi,
          created_at: now,
          updated_at: now,
        },
      });

      await prisma.inventory_batches.create({
        data: {
          id: uuid(),
          product_id: p.id,
          variant_id: variantId,
          batch_number: `B-${p.id.toUpperCase()}-${v.city.toUpperCase()}-01`,
          manufacturing_date: now,
          expiry_date: new Date(now.getTime() + 7 * 86400000),
          quantity: 100,
          storage_type: 'chilled',
          created_at: now,
          updated_at: now,
        },
      });
    }
  }

  // ---- Hubs ----
  const hubPune = uuid();
  const hubMumbai = uuid();
  await prisma.hubs.createMany({
    data: [
      { id: hubPune, name: 'Pune Central Hub', city: 'Pune', is_active: true, created_at: now, updated_at: now },
      { id: hubMumbai, name: 'Mumbai South Hub', city: 'Mumbai', is_active: true, created_at: now, updated_at: now },
    ],
  });

  // ---- Delivery boys (drivers) ----
  const driverMukesh = uuid();
  const driverSuresh = uuid();
  const deliveryBoyPassword = await bcrypt.hash('Delivery@123', 10);
  await prisma.delivery_boys.createMany({
    data: [
      {
        id: driverMukesh, name: 'Mukesh Bhai', first_name: 'Mukesh', last_name: 'Bhai', phone: '9988776655',
        date_of_birth: new Date(Date.UTC(1992, 3, 12)), address: 'Camp, Pune', city: 'Pune', hub_id: hubPune,
        username: 'mukesh.bhai', password: deliveryBoyPassword, is_active: true, created_at: now, updated_at: now,
      },
      {
        id: driverSuresh, name: 'Suresh Kumar', first_name: 'Suresh', last_name: 'Kumar', phone: '9988776656',
        date_of_birth: new Date(Date.UTC(1990, 7, 25)), address: 'Fort, Mumbai', city: 'Mumbai', hub_id: hubMumbai,
        username: 'suresh.kumar', password: deliveryBoyPassword, is_active: true, created_at: now, updated_at: now,
      },
    ],
  });

  // ---- Delivery routes / zones / slots ----
  const routeNorth = uuid();
  const routeSouth = uuid();
  await prisma.delivery_routes.create({
    data: { id: routeNorth, name: 'North Zone - Morning', route_code: 'NORTH-AM', city: 'Pune', driver_id: driverMukesh, hub_id: hubPune, sort_order: 0, created_at: now, updated_at: now },
  });
  await prisma.delivery_routes.create({
    data: { id: routeSouth, name: 'South Zone - Morning', route_code: 'SOUTH-AM', city: 'Mumbai', driver_id: driverSuresh, hub_id: hubMumbai, sort_order: 1, created_at: now, updated_at: now },
  });

  await prisma.delivery_zones.createMany({
    data: [
      { id: uuid(), pincode: '411001', city: 'Pune', area_name: 'Camp', delivery_fee: 0, min_order_value: 200, route_id: routeNorth, is_serviceable: true, created_at: now, updated_at: now },
      { id: uuid(), pincode: '411002', city: 'Pune', area_name: 'Shivajinagar', delivery_fee: 20, min_order_value: 200, route_id: routeNorth, is_serviceable: true, created_at: now, updated_at: now },
      { id: uuid(), pincode: '400001', city: 'Mumbai', area_name: 'Fort', delivery_fee: 30, min_order_value: 300, route_id: routeSouth, is_serviceable: true, created_at: now, updated_at: now },
    ],
  });

  // ---- Delivery Areas / Sub Areas / Apartments (Logistics masters) ----
  const areaCamp = uuid();
  const areaShivajinagar = uuid();
  const areaFort = uuid();
  await prisma.delivery_areas.createMany({
    data: [
      { id: areaCamp, state: 'Maharashtra', city: 'Pune', area_name: 'Camp', area_pin: '411001', is_serviceable: true, route_id: routeNorth, created_at: now, updated_at: now },
      { id: areaShivajinagar, state: 'Maharashtra', city: 'Pune', area_name: 'Shivajinagar', area_pin: '411002', is_serviceable: true, route_id: routeNorth, created_at: now, updated_at: now },
      { id: areaFort, state: 'Maharashtra', city: 'Mumbai', area_name: 'Fort', area_pin: '400001', is_serviceable: true, route_id: routeSouth, created_at: now, updated_at: now },
    ],
  });
  const subAreaCampMain = uuid();
  const subAreaFortMain = uuid();
  await prisma.sub_areas.createMany({
    data: [
      { id: subAreaCampMain, delivery_area_id: areaCamp, name: 'MG Road', created_at: now, updated_at: now },
      { id: subAreaFortMain, delivery_area_id: areaFort, name: 'Fort Market', created_at: now, updated_at: now },
    ],
  });
  await prisma.apartments.createMany({
    data: [
      { id: uuid(), sub_area_id: subAreaCampMain, name: 'Kumar Pinnacle', created_at: now, updated_at: now },
      { id: uuid(), sub_area_id: subAreaFortMain, name: 'Fort Heights', created_at: now, updated_at: now },
    ],
  });

  const slotMorning = uuid();
  const slotEvening = uuid();
  await prisma.delivery_slots.create({
    data: { id: slotMorning, label: '6 AM - 8 AM', start_time: new Date('1970-01-01T06:00:00'), end_time: new Date('1970-01-01T08:00:00'), route_id: routeNorth, sort_order: 0, created_at: now, updated_at: now },
  });
  await prisma.delivery_slots.create({
    data: { id: slotEvening, label: '5 PM - 7 PM', start_time: new Date('1970-01-01T17:00:00'), end_time: new Date('1970-01-01T19:00:00'), route_id: routeSouth, sort_order: 1, created_at: now, updated_at: now },
  });

  // ---- App Banners (home screen: image carousel + one video) ----
  await prisma.app_banners.createMany({
    data: [
      { id: uuid(), banner_type: 'image', title: 'Fresh Milk Daily', media_url: img('banner-milk'), is_active: true, sort_order: 0, created_at: now, updated_at: now },
      { id: uuid(), banner_type: 'image', title: 'Pure Desi Ghee', media_url: img('banner-ghee'), is_active: true, sort_order: 1, created_at: now, updated_at: now },
      { id: uuid(), banner_type: 'image', title: 'Subscribe & Save', media_url: img('banner-subscribe'), is_active: true, sort_order: 2, created_at: now, updated_at: now },
      { id: uuid(), banner_type: 'video', title: 'Farm to Home Story', media_url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', is_active: true, sort_order: 0, created_at: now, updated_at: now },
    ],
  });

  // ---- Customers ----
  const customersData = [
    { id: uuid(), phone: '9876543210', name: 'Rahul Sharma', city: 'Pune', pincode: '411001', address: 'Camp, Pune', hubId: hubPune, routeId: routeNorth, deliveryBoyId: driverMukesh, sequence: 1, lat: 18.5195, lng: 73.8779 },
    { id: uuid(), phone: '9876543211', name: 'Priya Verma', city: 'Pune', pincode: '411002', address: 'Shivajinagar, Pune', hubId: hubPune, routeId: routeNorth, deliveryBoyId: driverMukesh, sequence: 2, lat: 18.5308, lng: 73.8474 },
    { id: uuid(), phone: '9876543212', name: 'Amit Deshmukh', city: 'Mumbai', pincode: '400001', address: 'Fort, Mumbai', hubId: hubMumbai, routeId: routeSouth, deliveryBoyId: driverSuresh, sequence: 1, lat: 18.9345, lng: 72.8348 },
  ];
  for (const c of customersData) {
    const code = await customerCodeService.next();
    await prisma.customers.create({
      data: {
        id: c.id,
        code,
        phone: c.phone,
        name: c.name,
        address: c.address,
        city: c.city,
        pincode: c.pincode,
        state: 'Maharashtra',
        hub_id: c.hubId,
        route_id: c.routeId,
        delivery_boy_id: c.deliveryBoyId,
        delivery_sequence: c.sequence,
        latitude: c.lat,
        longitude: c.lng,
        customer_type: 'prepaid',
        registered_by: 'customer',
        orders_count: 0,
        leads_count: 0,
        last_seen_at: now,
        created_at: now,
        updated_at: now,
      },
    });
  }

  // Wallet for first customer
  await prisma.customer_wallets.create({
    data: { id: uuid(), customer_id: customersData[0].id, balance: 20000n, created_at: now, updated_at: now },
  });
  await prisma.wallet_transactions.create({
    data: {
      id: uuid(),
      customer_id: customersData[0].id,
      type: 'credit',
      amount: 20000n,
      balance_after: 20000n,
      notes: 'Welcome bonus (test data)',
      created_at: now,
      updated_at: now,
    },
  });

  // ---- Leads ----
  await prisma.leads.createMany({
    data: [
      { id: uuid(), name: 'Sneha Patil', phone: '9123456780', source: 'free_sample', status: 'new', message: 'Interested in daily milk delivery', created_at: now, updated_at: now },
      { id: uuid(), name: 'Vikas Rao', phone: '9123456781', source: 'free_sample', status: 'contacted', message: 'Wants ghee subscription info', created_at: now, updated_at: now },
      { id: uuid(), name: 'Anita Joshi', phone: '9123456782', source: 'website', status: 'converted', message: 'Signed up for milk subscription', created_at: now, updated_at: now },
    ],
  });

  // ---- Orders (+ items) ----
  async function createOrder(opts: {
    customer: typeof customersData[number];
    items: { productId: string; qty: number }[];
    status: string;
    paymentStatus: string;
    routeId: string;
    slotId: string;
    invoiceSuffix: string;
  }) {
    const orderId = uuid();
    let subtotal = 0;
    const lineItems = opts.items.map((it) => {
      const p = products.find((x) => x.id === it.productId)!;
      const rate = p.variants[0].rate;
      const lineTotal = rate * it.qty;
      subtotal += lineTotal;
      return {
        id: uuid(),
        order_id: orderId,
        product_id: p.id,
        product_name: p.name,
        size: p.variants[0].packaging,
        quantity: it.qty,
        unit_price: rate,
        purchase_type: 'BUY_ONCE',
        line_total: lineTotal,
        variant_id: variantIds[p.id],
        created_at: now,
        updated_at: now,
      };
    });

    await prisma.orders.create({
      data: {
        id: orderId,
        customer_id: opts.customer.id,
        customer_name: opts.customer.name,
        phone: opts.customer.phone,
        address: opts.customer.address,
        pincode: opts.customer.pincode,
        status: opts.status,
        payment_status: opts.paymentStatus,
        payment_method: 'cod',
        total_amount: subtotal,
        subtotal: BigInt(subtotal),
        delivery_fee: 0n,
        tax_amount: 0n,
        wallet_amount_used: 0n,
        route_id: opts.routeId,
        delivery_slot_id: opts.slotId,
        delivery_date: now,
        invoice_number: `INV-TEST-${opts.invoiceSuffix}`,
        created_at: now,
        updated_at: now,
      },
    });

    await prisma.order_items.createMany({ data: lineItems });

    await prisma.customers.update({
      where: { id: opts.customer.id },
      data: { orders_count: { increment: 1 } },
    });
  }

  await createOrder({
    customer: customersData[0],
    items: [{ productId: 'prod_cow_milk_1l', qty: 2 }, { productId: 'prod_a2_ghee_500g', qty: 1 }],
    status: 'DELIVERED',
    paymentStatus: 'paid',
    routeId: routeNorth,
    slotId: slotMorning,
    invoiceSuffix: '001',
  });
  await createOrder({
    customer: customersData[1],
    items: [{ productId: 'prod_curd_400g', qty: 3 }],
    status: 'CONFIRMED',
    paymentStatus: 'paid',
    routeId: routeNorth,
    slotId: slotMorning,
    invoiceSuffix: '002',
  });
  await createOrder({
    customer: customersData[2],
    items: [{ productId: 'prod_buffalo_milk_1l', qty: 1 }, { productId: 'prod_fresh_paneer_200g', qty: 2 }],
    status: 'PENDING',
    paymentStatus: 'pending',
    routeId: routeSouth,
    slotId: slotEvening,
    invoiceSuffix: '003',
  });

  // ---- Subscriptions ----
  const today = new Date();
  const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));

  const subRahul = uuid();
  await prisma.subscriptions.create({
    data: {
      id: subRahul,
      customer_id: customersData[0].id,
      product_id: 'prod_cow_milk_1l',
      variant_id: variantIds['prod_cow_milk_1l'],
      frequency: 'daily',
      quantity: 1,
      delivery_slot_id: slotMorning,
      status: 'active',
      next_delivery_date: todayUTC,
      created_at: now,
      updated_at: now,
    },
  });
  await prisma.subscriptions.create({
    data: {
      id: uuid(),
      customer_id: customersData[1].id,
      product_id: 'prod_a2_ghee_500g',
      variant_id: variantIds['prod_a2_ghee_500g'],
      frequency: 'weekly',
      quantity: 1,
      delivery_slot_id: slotMorning,
      status: 'paused',
      paused_until: new Date(Date.now() + 5 * 86400000),
      created_at: now,
      updated_at: now,
    },
  });

  const subAmit = uuid();
  const yesterdayUTC = new Date(todayUTC);
  yesterdayUTC.setUTCDate(yesterdayUTC.getUTCDate() - 1);
  await prisma.subscriptions.create({
    data: {
      id: subAmit,
      customer_id: customersData[2].id,
      product_id: 'prod_buffalo_milk_1l',
      variant_id: variantIds['prod_buffalo_milk_1l'],
      frequency: 'daily',
      quantity: 2,
      delivery_slot_id: slotEvening,
      status: 'active',
      next_delivery_date: todayUTC,
      created_at: now,
      updated_at: now,
    },
  });

  // ---- Delivery Records (yesterday's already-marked delivery, so Mark Daily Delivery has an Unmark example) ----
  await prisma.delivery_records.create({
    data: {
      id: uuid(),
      subscription_id: subAmit,
      customer_id: customersData[2].id,
      delivery_boy_id: driverSuresh,
      delivery_date: yesterdayUTC,
      product_id: 'prod_buffalo_milk_1l',
      variant_id: variantIds['prod_buffalo_milk_1l'],
      quantity_ordered: 2,
      quantity_delivered: 2,
      pending_qty: 0,
      bottles_collected: 2,
      status: 'delivered',
      delivered_at: yesterdayUTC,
      created_at: now,
      updated_at: now,
    },
  });

  // ---- Feedback (+ activity logs mirroring what real events would produce) ----
  await prisma.customer_feedback.create({
    data: {
      id: uuid(),
      customer_id: customersData[0].id,
      rating: 5,
      comment: 'Milk quality is excellent, always fresh on delivery.',
      created_at: now,
    },
  });

  await prisma.activity_logs.createMany({
    data: [
      { id: uuid(), type: 'customer_registered', title: 'New Customer Registered', message: `A new customer registered with phone ${customersData[0].phone}.`, customer_id: customersData[0].id, created_at: now },
      { id: uuid(), type: 'customer_registered', title: 'New Customer Registered', message: `A new customer registered with phone ${customersData[1].phone}.`, customer_id: customersData[1].id, created_at: now },
      { id: uuid(), type: 'customer_registered', title: 'New Customer Registered', message: `A new customer registered with phone ${customersData[2].phone}.`, customer_id: customersData[2].id, created_at: now },
      { id: uuid(), type: 'feedback', title: 'New Feedback', message: `${customersData[0].name} rated 5/5: Milk quality is excellent, always fresh on delivery.`, customer_id: customersData[0].id, created_at: now },
      { id: uuid(), type: 'enquiry', title: 'New Enquiry', message: 'Sneha Patil (9123456780) submitted an enquiry: Interested in daily milk delivery', created_at: now },
      { id: uuid(), type: 'one_time_order', title: 'One Time Order Request', message: `${customersData[2].name}, order for Buffalo Milk, Fresh Paneer placed successfully (INV-TEST-003).`, customer_id: customersData[2].id, created_at: now },
      { id: uuid(), type: 'subscription', subtype: 'create', title: 'Subscribe Request', message: `${customersData[0].name}, order for Cow Milk : 1 starting on daily basis is placed successfully.`, customer_id: customersData[0].id, created_at: now },
      { id: uuid(), type: 'subscription', subtype: 'pause', title: 'Subscribe Pause Request', message: `${customersData[1].name}, pause request received. Plan will be paused.`, customer_id: customersData[1].id, created_at: now },
      { id: uuid(), type: 'wallet', title: 'Wallet Credited', message: `${customersData[0].name} added ₹200 into the wallet.`, customer_id: customersData[0].id, created_at: now },
    ],
  });

  // ---- Staff types + office staff ----
  const staffTypeSupervisor = uuid();
  const staffTypeOfficeExec = uuid();
  await prisma.staff_types.createMany({
    data: [
      { id: staffTypeSupervisor, name: 'Supervisor', is_active: true, created_at: now, updated_at: now },
      { id: staffTypeOfficeExec, name: 'Office Executive', is_active: true, created_at: now, updated_at: now },
    ],
  });

  const staffPasswordHash = await bcrypt.hash('Staff@123', 10);
  await prisma.office_staff.createMany({
    data: [
      {
        id: uuid(), staff_type_id: staffTypeSupervisor, name: 'Sagar Chankankar', email: 'sagar.staff@dairyapp.com',
        contact_no: '9921271527', address: 'Balewadi, Pune', username: 'sagarc', password: staffPasswordHash,
        is_active: true, created_at: now, updated_at: now,
      },
      {
        id: uuid(), staff_type_id: staffTypeOfficeExec, name: 'Priyanka Jawale', email: 'priyanka.staff@dairyapp.com',
        contact_no: '7588286283', address: 'Yerwada, Pune', username: 'priyankaj', password: staffPasswordHash,
        is_active: true, created_at: now, updated_at: now,
      },
    ],
  });

  // ---- Delivery modes ----
  await prisma.delivery_modes.createMany({
    data: [
      { id: uuid(), name: 'Ring the Bell', is_active: true, sort_order: 0, created_at: now, updated_at: now },
      { id: uuid(), name: 'Leave at Door', is_active: true, sort_order: 1, created_at: now, updated_at: now },
      { id: uuid(), name: 'Call Before Delivery', is_active: true, sort_order: 2, created_at: now, updated_at: now },
    ],
  });

  // ---- Delivery charge tiers (by order value) ----
  await prisma.delivery_charge_tiers.createMany({
    data: [
      { id: uuid(), charge_from: 0, charge_to: 199, charge: 30, created_at: now, updated_at: now },
      { id: uuid(), charge_from: 200, charge_to: 499, charge: 15, created_at: now, updated_at: now },
      { id: uuid(), charge_from: 500, charge_to: 999999, charge: 0, created_at: now, updated_at: now },
    ],
  });

  // ---- Cancel reasons ----
  await prisma.cancel_reasons.createMany({
    data: [
      { id: uuid(), reason: 'Product not required', is_active: true, created_at: now, updated_at: now },
      { id: uuid(), reason: 'Not happy with delivery service', is_active: true, created_at: now, updated_at: now },
      { id: uuid(), reason: 'Not happy with quality', is_active: true, created_at: now, updated_at: now },
      { id: uuid(), reason: 'Shifted out of city', is_active: true, created_at: now, updated_at: now },
      { id: uuid(), reason: 'Changing my subscription', is_active: true, created_at: now, updated_at: now },
    ],
  });

  // ---- Email Terms & Conditions (singleton) ----
  await prisma.site_settings.upsert({
    where: { key: 'email_terms_conditions' },
    update: { value: 'By subscribing to Shrishti Dairy Farm deliveries, you agree to our standard delivery and billing terms. Orders can be paused or cancelled from the app up to the daily cut-off time. For support, contact us at support@shrishtidairyfarm.com.' },
    create: {
      key: 'email_terms_conditions',
      value: 'By subscribing to Shrishti Dairy Farm deliveries, you agree to our standard delivery and billing terms. Orders can be paused or cancelled from the app up to the daily cut-off time. For support, contact us at support@shrishtidairyfarm.com.',
      created_at: now,
      updated_at: now,
    },
  });

  console.log('Seeding done.');
}

async function main() {
  await clean();
  await seed();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

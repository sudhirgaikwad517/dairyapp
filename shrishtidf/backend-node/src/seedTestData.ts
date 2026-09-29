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
  await prisma.notifications.deleteMany({});
  await prisma.farm_visit_requests.deleteMany({});
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
  await prisma.access_controls.deleteMany({});
  await prisma.office_staff.deleteMany({});
  await prisma.staff_types.deleteMany({});
  await prisma.delivery_modes.deleteMany({});
  await prisma.delivery_charge_tiers.deleteMany({});
  await prisma.cancel_reasons.deleteMany({});
  await prisma.feedback_categories.deleteMany({});
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
    { id: uuid(), phone: '9876543212', name: 'Amit Deshmukh', city: 'Mumbai', pincode: '400001', address: 'Fort, Mumbai', hubId: hubMumbai, routeId: routeSouth, deliveryBoyId: driverSuresh, sequence: 1, lat: 18.9345, lng: 72.8348, customerType: 'postpaid' },
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
        customer_type: (c as any).customerType || 'prepaid',
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
    status: 'IN_PROCESS',
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
  await createOrder({
    customer: customersData[0],
    items: [{ productId: 'prod_a2_ghee_500g', qty: 2 }],
    status: 'SHIPPED',
    paymentStatus: 'paid',
    routeId: routeNorth,
    slotId: slotMorning,
    invoiceSuffix: '004',
  });
  await createOrder({
    customer: customersData[2],
    items: [{ productId: 'prod_cow_milk_1l', qty: 1 }],
    status: 'CANCELLED',
    paymentStatus: 'pending',
    routeId: routeSouth,
    slotId: slotEvening,
    invoiceSuffix: '005',
  });

  // ---- Delivery modes (created early — subscriptions below reference them) ----
  const modeRingBell = uuid();
  const modeLeaveAtDoor = uuid();
  const modeCallBefore = uuid();
  await prisma.delivery_modes.createMany({
    data: [
      { id: modeRingBell, name: 'Ring the Bell', is_active: true, sort_order: 0, created_at: now, updated_at: now },
      { id: modeLeaveAtDoor, name: 'Leave at Door', is_active: true, sort_order: 1, created_at: now, updated_at: now },
      { id: modeCallBefore, name: 'Call Before Delivery', is_active: true, sort_order: 2, created_at: now, updated_at: now },
    ],
  });

  // ---- Subscriptions ----
  const today = new Date();
  const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const yesterdayUTC = new Date(todayUTC);
  yesterdayUTC.setUTCDate(yesterdayUTC.getUTCDate() - 1);
  const tomorrowUTC = new Date(todayUTC);
  tomorrowUTC.setUTCDate(tomorrowUTC.getUTCDate() + 1);
  const thirtyDaysAgoUTC = new Date(todayUTC);
  thirtyDaysAgoUTC.setUTCDate(thirtyDaysAgoUTC.getUTCDate() - 35);
  const expiredAtUTC = new Date(todayUTC);
  expiredAtUTC.setUTCDate(expiredAtUTC.getUTCDate() - 5);

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
      delivery_mode_id: modeRingBell,
      rate: 65,
      status: 'active',
      start_date: yesterdayUTC,
      next_delivery_date: todayUTC,
      created_at: now,
      updated_at: now,
    },
  });
  const subPriyaGhee = uuid();
  await prisma.subscriptions.create({
    data: {
      id: subPriyaGhee,
      customer_id: customersData[1].id,
      product_id: 'prod_a2_ghee_500g',
      variant_id: variantIds['prod_a2_ghee_500g'],
      frequency: 'weekly',
      quantity: 1,
      delivery_slot_id: slotMorning,
      delivery_mode_id: modeLeaveAtDoor,
      rate: 650,
      status: 'paused',
      start_date: yesterdayUTC,
      paused_from: todayUTC,
      paused_until: new Date(Date.now() + 5 * 86400000),
      created_at: now,
      updated_at: now,
    },
  });
  await prisma.activity_logs.create({
    data: {
      id: uuid(), type: 'subscription', subtype: 'pause', title: 'Subscribe Pause Request',
      message: 'Priya Verma, pause request received. Plan will be paused from ' + todayUTC.toISOString().slice(0, 10) + '.',
      customer_id: customersData[1].id, subscription_id: subPriyaGhee, effective_date: todayUTC, actor: null,
      created_at: now,
    },
  });

  const subAmit = uuid();
  await prisma.subscriptions.create({
    data: {
      id: subAmit,
      customer_id: customersData[2].id,
      product_id: 'prod_buffalo_milk_1l',
      variant_id: variantIds['prod_buffalo_milk_1l'],
      frequency: 'daily',
      quantity: 2,
      delivery_slot_id: slotEvening,
      delivery_mode_id: modeCallBefore,
      rate: 75,
      status: 'active',
      start_date: yesterdayUTC,
      next_delivery_date: todayUTC,
      created_at: now,
      updated_at: now,
    },
  });

  // A change request already submitted for Rahul's milk plan (qty 1 -> 2), pending
  // until tomorrow — demonstrates the cutoff-aware Change Request flow end to end.
  const subRahulGheeChange = uuid();
  await prisma.subscriptions.create({
    data: {
      id: subRahulGheeChange,
      customer_id: customersData[0].id,
      product_id: 'prod_a2_ghee_500g',
      variant_id: variantIds['prod_a2_ghee_500g'],
      frequency: 'daily',
      quantity: 1,
      delivery_slot_id: slotMorning,
      delivery_mode_id: modeRingBell,
      rate: 650,
      status: 'active',
      start_date: yesterdayUTC,
      next_delivery_date: todayUTC,
      pending_quantity: 2,
      change_effective_date: tomorrowUTC,
      created_at: now,
      updated_at: now,
    },
  });
  await prisma.activity_logs.create({
    data: {
      id: uuid(), type: 'change_request', subtype: 'change_request', title: 'Change Request',
      message: 'Rahul Sharma requested a change to their subscription, effective ' + tomorrowUTC.toISOString().slice(0, 10) + '.',
      customer_id: customersData[0].id, subscription_id: subRahulGheeChange, effective_date: tomorrowUTC, actor: null,
      created_at: now,
    },
  });

  // ---- Postpaid inactive plan example (Amit is postpaid; this old plan was deactivated) ----
  const inactivatedAtUTC = new Date(todayUTC);
  inactivatedAtUTC.setUTCDate(inactivatedAtUTC.getUTCDate() - 10);
  await prisma.subscriptions.create({
    data: {
      id: uuid(),
      customer_id: customersData[2].id,
      product_id: 'prod_curd_400g',
      variant_id: variantIds['prod_curd_400g'],
      frequency: 'daily',
      quantity: 1,
      rate: 40,
      status: 'inactive',
      start_date: thirtyDaysAgoUTC,
      inactivated_at: inactivatedAtUTC,
      created_at: now,
      updated_at: now,
    },
  });

  // A prepaid plan whose 30-day validity ran out 5 days ago — shows up under the
  // "Expired" tab without ever having been explicitly cancelled.
  await prisma.subscriptions.create({
    data: {
      id: uuid(),
      customer_id: customersData[1].id,
      product_id: 'prod_cow_milk_1l',
      variant_id: variantIds['prod_cow_milk_1l'],
      frequency: 'daily',
      quantity: 1,
      delivery_slot_id: slotMorning,
      delivery_mode_id: modeLeaveAtDoor,
      rate: 65,
      status: 'active',
      start_date: thirtyDaysAgoUTC,
      next_delivery_date: expiredAtUTC,
      plan_valid_days: 30,
      expires_at: expiredAtUTC,
      created_at: now,
      updated_at: now,
    },
  });

  // ---- Vacation (Priya, starting today for a week — Mark Daily Delivery must skip her over this range) ----
  const vacationToUTC = new Date(todayUTC);
  vacationToUTC.setUTCDate(vacationToUTC.getUTCDate() + 7);
  await prisma.vacations.create({
    data: {
      id: uuid(),
      customer_id: customersData[1].id,
      from_date: todayUTC,
      to_date: vacationToUTC,
      remark: 'Family trip',
      entry_by: 'admin',
      created_at: now,
      updated_at: now,
    },
  });

  // ---- A completed pause -> resume cycle on Amit's milk plan (historical, for the Pause Resume Report) ----
  const pauseRequestAt = new Date(now.getTime() - 3 * 86400000);
  const resumeRequestAt = new Date(now.getTime() - 1 * 86400000);
  const pastPauseEffective = new Date(todayUTC); pastPauseEffective.setUTCDate(pastPauseEffective.getUTCDate() - 3);
  await prisma.activity_logs.create({
    data: {
      id: uuid(), type: 'subscription', subtype: 'pause', title: 'Subscribe Pause Request',
      message: 'Amit Deshmukh, pause request received.',
      customer_id: customersData[2].id, subscription_id: subAmit, effective_date: pastPauseEffective, actor: null,
      created_at: pauseRequestAt,
    },
  });
  await prisma.activity_logs.create({
    data: {
      id: uuid(), type: 'subscription', subtype: 'resume', title: 'Subscribe Resumed Request',
      message: 'Amit Deshmukh, resume request received.',
      customer_id: customersData[2].id, subscription_id: subAmit, effective_date: new Date(now.getTime() - 1 * 86400000), actor: null,
      created_at: resumeRequestAt,
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

  // ---- One Time Order (admin-placed, via the Subscriptions > One Time Order screen) ----
  const oneTimeOrderId = uuid();
  await prisma.orders.create({
    data: {
      id: oneTimeOrderId,
      customer_id: customersData[0].id,
      customer_name: customersData[0].name,
      phone: customersData[0].phone,
      address: customersData[0].address,
      pincode: customersData[0].pincode,
      delivery_date: tomorrowUTC,
      route_id: routeNorth,
      status: 'PENDING',
      subtotal: 100,
      tax_amount: 0,
      total_amount: 100,
      payment_method: 'cod',
      payment_status: 'pending',
      invoice_number: `SDF-TEST-${oneTimeOrderId.substring(0, 8).toUpperCase()}`,
      created_at: now,
      updated_at: now,
      order_items: {
        create: [{
          id: uuid(),
          product_id: 'prod_fresh_paneer_200g',
          product_name: 'Fresh Paneer',
          size: '200g',
          quantity: 2,
          unit_price: 50,
          purchase_type: 'BUY_ONCE',
          line_total: 100,
          variant_id: variantIds['prod_fresh_paneer_200g'],
          created_at: now,
          updated_at: now,
        }],
      },
    },
  });

  // ---- Feedback Master (categories) + Feedback (+ activity logs mirroring what real events would produce) ----
  const feedbackCategoryQuality = uuid();
  const feedbackCategoryDelay = uuid();
  await prisma.feedback_categories.createMany({
    data: [
      { id: feedbackCategoryQuality, name: 'Milk Quality', is_active: true, created_at: now, updated_at: now },
      { id: feedbackCategoryDelay, name: 'Delivery Delay', is_active: true, created_at: now, updated_at: now },
      { id: uuid(), name: 'Missed Delivery', is_active: true, created_at: now, updated_at: now },
      { id: uuid(), name: 'Wrong Product Delivered', is_active: true, created_at: now, updated_at: now },
      { id: uuid(), name: 'Billing / Wallet Issue', is_active: true, created_at: now, updated_at: now },
      { id: uuid(), name: 'App / Website Issue', is_active: true, created_at: now, updated_at: now },
      { id: uuid(), name: 'Delivery Boy Behaviour', is_active: true, created_at: now, updated_at: now },
      { id: uuid(), name: 'Other', is_active: true, created_at: now, updated_at: now },
    ],
  });

  await prisma.customer_feedback.create({
    data: {
      id: uuid(),
      customer_id: customersData[0].id,
      rating: 5,
      comment: 'Milk quality is excellent, always fresh on delivery.',
      feedback_category_id: feedbackCategoryQuality,
      feedback_mode: 'app',
      status: 'new',
      entry_by: 'customer',
      created_at: now,
      updated_at: now,
    },
  });

  const resolvedFeedbackId = uuid();
  await prisma.customer_feedback.create({
    data: {
      id: resolvedFeedbackId,
      customer_id: customersData[1].id,
      comment: 'Milk was delivered 2 hours late today.',
      feedback_category_id: feedbackCategoryDelay,
      feedback_mode: 'call',
      status: 'resolved',
      reply: 'Apologies for the delay, our delivery boy had a vehicle issue. It will not repeat.',
      replied_by: 'Admin',
      replied_at: now,
      entry_by: 'admin',
      created_at: now,
      updated_at: now,
    },
  });
  await prisma.feedback_status_logs.createMany({
    data: [
      { id: uuid(), feedback_id: resolvedFeedbackId, status: 'new', changed_by: 'Admin', note: 'Feedback created by admin', created_at: now },
      { id: uuid(), feedback_id: resolvedFeedbackId, status: 'resolved', changed_by: 'Admin', note: 'Auto-updated after admin reply', created_at: now },
    ],
  });

  // ---- Notifications (a welcome broadcast sent to every seeded customer) ----
  const welcomeNotificationId = uuid();
  await prisma.notifications.create({
    data: {
      id: welcomeNotificationId,
      title: 'Welcome to Shrishti Dairy Farm!',
      message: 'Thank you for choosing us for your daily milk delivery. Reach out to us anytime from the Feedback section for any query.',
      recipient_count: customersData.length,
      sent_by: 'Admin',
      created_at: now,
    },
  });
  await prisma.notification_recipients.createMany({
    data: customersData.map((c) => ({ id: uuid(), notification_id: welcomeNotificationId, customer_id: c.id, created_at: now })),
  });

  // ---- Farm Visit Requests (public form, no login required) ----
  await prisma.farm_visit_requests.createMany({
    data: [
      {
        id: uuid(), name: 'Snehal Patil', contact_no: '9561072231', number_of_persons: 2,
        address: 'Wakad, Pune', visit_date: new Date(Date.UTC(2026, 9, 4)), visit_time_slot: '02 PM - 03 PM',
        created_at: now, updated_at: now,
      },
      {
        id: uuid(), name: 'Praveen Purushottam', contact_no: '9011077026', number_of_persons: 4,
        address: 'Siddhashila Eira, Dhawale Chowk Road, Koyate Wasti, Punawale', visit_date: new Date(Date.UTC(2026, 9, 10)), visit_time_slot: '10 AM - 11 AM',
        reply: 'Sure, please arrive 10 minutes early at the main gate.', replied_by: 'Admin', replied_at: now,
        created_at: now, updated_at: now,
      },
    ],
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
  const officeStaffSagar = uuid();
  const officeStaffPriyanka = uuid();
  await prisma.office_staff.createMany({
    data: [
      {
        id: officeStaffSagar, staff_type_id: staffTypeSupervisor, name: 'Sagar Chankankar', email: 'sagar.staff@dairyapp.com',
        contact_no: '9921271527', address: 'Balewadi, Pune', username: 'sagarc', password: staffPasswordHash,
        is_active: true, created_at: now, updated_at: now,
      },
      {
        id: officeStaffPriyanka, staff_type_id: staffTypeOfficeExec, name: 'Priyanka Jawale', email: 'priyanka.staff@dairyapp.com',
        contact_no: '7588286283', address: 'Yerwada, Pune', username: 'priyankaj', password: staffPasswordHash,
        is_active: true, created_at: now, updated_at: now,
      },
    ],
  });

  // ---- User Access Control (a realistic starting permission set for the Supervisor) ----
  const accessControlSagarId = uuid();
  await prisma.access_controls.create({
    data: { id: accessControlSagarId, staff_type_id: staffTypeSupervisor, office_staff_id: officeStaffSagar, created_at: now, updated_at: now },
  });
  const fullAccess = { can_create: true, can_update: true, can_view: true, can_pdf: true, can_excel: true };
  const viewOnly = { can_create: false, can_update: false, can_view: true, can_pdf: true, can_excel: true };
  await prisma.access_control_permissions.createMany({
    data: [
      { id: uuid(), access_control_id: accessControlSagarId, module_key: 'hub', ...fullAccess },
      { id: uuid(), access_control_id: accessControlSagarId, module_key: 'delivery_area', ...fullAccess },
      { id: uuid(), access_control_id: accessControlSagarId, module_key: 'route', ...fullAccess },
      { id: uuid(), access_control_id: accessControlSagarId, module_key: 'delivery_boy', ...fullAccess },
      { id: uuid(), access_control_id: accessControlSagarId, module_key: 'mark_daily_delivery', ...fullAccess },
      { id: uuid(), access_control_id: accessControlSagarId, module_key: 'subscribe', ...fullAccess },
      { id: uuid(), access_control_id: accessControlSagarId, module_key: 'change_request', ...fullAccess },
      { id: uuid(), access_control_id: accessControlSagarId, module_key: 'customers', ...viewOnly },
      { id: uuid(), access_control_id: accessControlSagarId, module_key: 'wallet_report', ...viewOnly },
      { id: uuid(), access_control_id: accessControlSagarId, module_key: 'feedback', ...viewOnly },
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

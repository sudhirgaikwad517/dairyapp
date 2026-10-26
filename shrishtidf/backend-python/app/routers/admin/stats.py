import re

from fastapi import APIRouter, Request
from sqlalchemy import func, select

from ... import models as m
from ...core.dates import local_date_of, local_day_end, local_day_start, local_today, month_end, month_start
from ...core.deps import DB
from ...core.http import guard, js_round, ok, query, respond
from .common import perm

router = APIRouter()

ALERT_TYPES = [
    "customer_registered",
    "feedback",
    "enquiry",
    "subscription",
    "one_time_order",
    "holiday",
    "change_request",
    "wallet",
]


def parse_liters_from_size(size: str | None) -> float:
    if not size:
        return 0
    s = re.sub(r"\s+", "", size.lower())
    ml = re.search(r"([\d.]+)ml", s)
    if ml:
        return _float(ml.group(1)) / 1000
    liters = re.search(r"([\d.]+)l", s)
    return _float(liters.group(1)) if liters else 0


def _float(text: str) -> float:
    match = re.match(r"\d*\.?\d+|\d+", text)
    return float(match.group(0)) if match else 0


@router.get("/dashboard")
@guard("Server Error")
def dashboard(request: Request, db: DB, user: dict = perm("dashboard", "view")):
    zone_param = (query(request, "zone") or "all").lower()
    zone = zone_param if zone_param in ("pune", "mumbai") else "all"

    today = local_today()
    from_date = local_date_of(query(request, "from")) if query(request, "from") else None
    to_date = local_date_of(query(request, "to")) if query(request, "to") else None
    range_from = local_day_start(from_date) if from_date else local_day_start(month_start(today))
    range_to = local_day_end(to_date) if to_date else local_day_end(month_end(today))

    zone_customer_ids = None
    if zone != "all":
        zone_customer_ids = list(db.scalars(select(m.customers.id).where(func.lower(m.customers.city) == zone)))

    def scoped(stmt, column):
        return stmt.where(column.in_(zone_customer_ids)) if zone_customer_ids is not None else stmt

    def count(stmt) -> int:
        return db.scalar(stmt) or 0

    today_start, today_end = local_day_start(today), local_day_end(today)
    this_month_start, this_month_end = local_day_start(month_start(today)), local_day_end(month_end(today))

    # ---- Milk delivered this month (liters) ----
    milk_delivered = 0.0
    milk_category = db.scalar(
        select(m.product_categories.id).where(m.product_categories.label.ilike("%milk%")).limit(1)
    )
    if milk_category:
        milk_product_ids = list(db.scalars(select(m.products.id).where(m.products.category_id == milk_category)))
        if milk_product_ids:
            stmt = (
                select(m.order_items.size, m.order_items.quantity)
                .join(m.orders, m.orders.id == m.order_items.order_id)
                .where(
                    m.order_items.product_id.in_(milk_product_ids),
                    m.orders.status == "DELIVERED",
                    m.orders.delivery_date >= month_start(today),
                    m.orders.delivery_date <= month_end(today),
                )
            )
            for size, quantity in db.execute(scoped(stmt, m.orders.customer_id)):
                milk_delivered += parse_liters_from_size(size) * quantity

    customer_count = select(func.count()).select_from(m.customers)
    customers_registered = count(scoped(customer_count, m.customers.id))
    active_customers = count(scoped(customer_count.where(m.customers.is_active.is_(True)), m.customers.id))
    active_subscriptions = count(scoped(
        select(func.count()).select_from(m.subscriptions).where(m.subscriptions.status == "active"),
        m.subscriptions.customer_id,
    ))
    enquiries_this_month = count(
        select(func.count()).select_from(m.leads).where(
            m.leads.created_at >= this_month_start, m.leads.created_at <= this_month_end
        )
    )
    customers_this_month = count(scoped(
        customer_count.where(m.customers.created_at >= this_month_start, m.customers.created_at <= this_month_end),
        m.customers.id,
    ))
    customers_today = count(scoped(
        customer_count.where(m.customers.created_at >= today_start, m.customers.created_at <= today_end),
        m.customers.id,
    ))

    in_hand, negative = 0, 0
    for balance in db.scalars(scoped(select(m.customer_wallets.balance), m.customer_wallets.customer_id)):
        if int(balance) >= 0:
            in_hand += int(balance)
        else:
            negative += int(balance)

    # ---- Hold Request / Change Request (date range) ----
    def activity_count(*conditions) -> int:
        stmt = select(func.count()).select_from(m.activity_logs).where(
            *conditions, m.activity_logs.created_at >= range_from, m.activity_logs.created_at <= range_to
        )
        return count(scoped(stmt, m.activity_logs.customer_id))

    hold_count = activity_count(m.activity_logs.type == "subscription", m.activity_logs.subtype == "pause")
    change_count = activity_count(m.activity_logs.type == "change_request")

    # ---- Wallet statistics (date range + today) ----
    def wallet_sum(tx_type: str, reference_type: str | None, start, end) -> int:
        stmt = select(func.coalesce(func.sum(m.wallet_transactions.amount), 0)).where(
            m.wallet_transactions.type == tx_type,
            m.wallet_transactions.created_at >= start,
            m.wallet_transactions.created_at <= end,
        )
        if reference_type:
            stmt = stmt.where(m.wallet_transactions.reference_type == reference_type)
        return int(db.scalar(scoped(stmt, m.wallet_transactions.customer_id)) or 0)

    wallet_total = wallet_sum("credit", None, range_from, range_to)
    wallet_refunded = wallet_sum("debit", "refund", range_from, range_to)
    wallet_cash = wallet_sum("credit", "topup_cash", range_from, range_to)
    wallet_online = wallet_sum("credit", "topup_online", range_from, range_to)
    wallet_today_cash = wallet_sum("credit", "topup_cash", today_start, today_end)
    wallet_today_online = wallet_sum("credit", "topup_online", today_start, today_end)

    # ---- Alerts feed ----
    alerts, alert_counts, total_alerts = {}, {}, 0
    for alert_type in ALERT_TYPES:
        conditions = [m.activity_logs.type == alert_type, m.activity_logs.is_dismissed.is_(False)]
        items = db.scalars(scoped(
            select(m.activity_logs).where(*conditions).order_by(m.activity_logs.created_at.desc()).limit(10),
            m.activity_logs.customer_id,
        )).all()
        n = count(scoped(select(func.count()).select_from(m.activity_logs).where(*conditions), m.activity_logs.customer_id))
        alerts[alert_type] = [
            {"id": a.id, "title": a.title, "message": a.message, "createdAt": a.created_at} for a in items
        ]
        alert_counts[alert_type] = n
        total_alerts += n

    return ok({
        "zone": zone,
        "range": {"from": range_from, "to": range_to},
        "statistics": {
            "customersRegistered": customers_registered,
            "totalInHandWallet": in_hand,
            "totalNegativeWallet": negative,
            "activeCustomers": active_customers,
            "activeSubscriptions": active_subscriptions,
            "milkDeliveredThisMonth": js_round(milk_delivered * 100) / 100,
            "enquiriesThisMonth": enquiries_this_month,
            "customersRegisteredThisMonth": customers_this_month,
            "customersRegisteredToday": customers_today,
        },
        "holdRequest": {"count": hold_count, "from": range_from, "to": range_to},
        "changeRequest": {"count": change_count, "from": range_from, "to": range_to},
        "walletStats": {
            "totalAmount": wallet_total,
            "totalRefundedAmount": wallet_refunded,
            "totalRechargeCash": wallet_cash,
            "totalRechargeOnline": wallet_online,
        },
        "walletStatsToday": {
            "totalRecharge": wallet_today_cash + wallet_today_online,
            "totalRechargeCash": wallet_today_cash,
            "totalRechargeOnline": wallet_today_online,
        },
        "alerts": {"types": ALERT_TYPES, "counts": alert_counts, "total": total_alerts, "items": alerts},
    })


@router.patch("/alerts/{id}/dismiss")
@guard("Server Error")
def dismiss_alert(id: str, db: DB, user: dict = perm("dashboard", "update")):
    alert = db.get(m.activity_logs, id)
    if alert is None:
        raise LookupError("Alert not found")
    alert.is_dismissed = True
    db.commit()
    return respond({"success": True})

import DailyPlannerView from '../../components/DailyPlannerView';

export default function DeliveryBoyPendingDeliveryReport() {
  return (
    <DailyPlannerView
      title="Delivery Boy Wise Pending Delivery Report"
      description="Deliveries that were due on or before the selected date and still haven't been marked."
      groupBy="none"
      pendingOnly
      exportFilename="pending-delivery-report"
    />
  );
}

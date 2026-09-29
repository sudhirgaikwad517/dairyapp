import DailyPlannerView from '../../components/DailyPlannerView';

export default function DeliveryBoyWiseDailyPlannerReport() {
  return (
    <DailyPlannerView
      title="Delivery Boy-Wise Daily Planner Report"
      description="Total packets each delivery boy needs to carry, broken down by product and packaging."
      groupBy="deliveryBoy"
      exportFilename="delivery-boy-wise-daily-planner"
    />
  );
}

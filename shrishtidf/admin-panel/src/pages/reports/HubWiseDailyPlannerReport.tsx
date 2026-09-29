import DailyPlannerView from '../../components/DailyPlannerView';

export default function HubWiseDailyPlannerReport() {
  return (
    <DailyPlannerView
      title="Hub-Wise Daily Planner Report"
      description="Total packets to be delivered per hub, broken down by product and packaging."
      groupBy="hub"
      exportFilename="hub-wise-daily-planner"
    />
  );
}

import DailyPlannerView from '../../components/DailyPlannerView';

export default function DailyPlanner() {
  return (
    <DailyPlannerView
      title="Daily Planner"
      description="Every delivery due on a given date, one row per customer."
      groupBy="none"
      exportFilename="daily-planner"
    />
  );
}

import ChangeRequestReportView from '../../components/ChangeRequestReportView';

export default function ChangeRequestTodayTomorrow() {
  return (
    <ChangeRequestReportView
      title="Change Request For Today & Tomorrow"
      description="Change requests taking effect today or tomorrow — a quick heads-up for whoever runs Mark Daily Delivery next."
      quickRange="todayTomorrow"
      exportFilename="change-requests-today-tomorrow"
    />
  );
}

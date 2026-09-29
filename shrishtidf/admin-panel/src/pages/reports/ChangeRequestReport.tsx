import ChangeRequestReportView from '../../components/ChangeRequestReportView';

export default function ChangeRequestReport() {
  return (
    <ChangeRequestReportView
      title="Customer - Subscription Change Request Report"
      description="Every quantity, packaging or frequency change requested on a subscription, by customers or admin."
      exportFilename="change-requests"
    />
  );
}

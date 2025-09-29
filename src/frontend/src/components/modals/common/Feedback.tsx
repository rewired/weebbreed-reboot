export interface FeedbackProps {
  message: string;
}

export const Feedback = ({ message }: FeedbackProps) => (
  <p className="text-sm text-warning">{message}</p>
);

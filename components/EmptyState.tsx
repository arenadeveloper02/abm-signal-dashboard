interface EmptyStateProps {
  icon?: string;
  title: string;
  message: string;
}

export default function EmptyState({ icon = '📭', title, message }: EmptyStateProps) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-12 text-center">
      <span className="text-3xl" aria-hidden="true">{icon}</span>
      <h3 className="mt-3 text-sm font-semibold text-white">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-[#8B94A7]">{message}</p>
    </div>
  );
}

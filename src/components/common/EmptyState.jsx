export default function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="empty-state">
      {Icon && (
        <div className="empty-icon" aria-hidden="true">
          <Icon size={30} />
        </div>
      )}
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

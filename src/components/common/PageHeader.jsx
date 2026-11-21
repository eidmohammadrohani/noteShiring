export default function PageHeader({ title, subtitle, actions, icon: Icon }) {
  return (
    <div className="page-header">
      <div className="page-heading">
        {Icon && (
          <span className="page-heading-icon">
            <Icon size={24} aria-hidden="true" />
          </span>
        )}
        <div>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  );
}

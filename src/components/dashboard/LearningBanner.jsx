import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LearningBanner({ title, description, to, label }) {
  return (
    <section className="learning-banner" aria-label={title}>
      <div className="learning-banner-copy">
        <h2>{title}</h2>
        <p>{description}</p>
        <Link className="btn btn-primary" to={to}>
          {label} <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
      <img src="/images/learning-notebook.png" width="1536" height="1024" loading="lazy" alt="" />
    </section>
  );
}

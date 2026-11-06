import React from "react";
export const PageHeader = ({ eyebrow, title, children, actions }) => (
  <header className="atelier-page-header">
    <div>
      {eyebrow && <p className="atelier-eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
      {children && <p>{children}</p>}
    </div>
    {actions && <div className="atelier-page-header__actions">{actions}</div>}
  </header>
);
